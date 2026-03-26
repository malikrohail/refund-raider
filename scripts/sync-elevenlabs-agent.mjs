import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const toolManifestPath = path.join(root, "workflow", "refundRaiderToolManifest.json");
const agentConfigPath = path.join(root, "src", "lib", "agent", "refundRaiderAgentConfig.ts");
const envPaths = [path.join(root, ".env"), path.join(root, ".env.local")];

async function loadEnvFiles() {
  for (const envPath of envPaths) {
    let source;
    try {
      source = await readFile(envPath, "utf8");
    } catch {
      continue;
    }

    for (const rawLine of source.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }

      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parseExportedString(source, exportName) {
  const singleLinePattern = new RegExp(`export const ${exportName} =\\s*"([\\s\\S]*?)";`);
  const singleLineMatch = source.match(singleLinePattern);
  if (singleLineMatch) {
    return singleLineMatch[1];
  }

  const templatePattern = new RegExp(`export const ${exportName} =\\s*\`([\\s\\S]*?)\`\\.trim\\(\\);`);
  const templateMatch = source.match(templatePattern);
  if (templateMatch) {
    return templateMatch[1];
  }

  throw new Error(`Unable to extract ${exportName} from ${agentConfigPath}`);
}

function summariseWorkflow(workflow) {
  return {
    nodes: Object.keys(workflow.nodes ?? {}).length,
    edges: Object.keys(workflow.edges ?? {}).length,
    labels: Object.values(workflow.nodes ?? {}).map((node) => node.label).filter(Boolean)
  };
}

async function elevenFetch(pathname, apiKey, options = {}) {
  const response = await fetch(`https://api.elevenlabs.io${pathname}`, {
    ...options,
    headers: {
      "xi-api-key": apiKey,
      ...(options.headers ?? {})
    }
  });

  return response;
}

async function getCurrentAgent(agentId, apiKey) {
  const response = await elevenFetch(`/v1/convai/agents/${agentId}`, apiKey);

  if (!response.ok) {
    throw new Error(`Failed to fetch current ElevenLabs agent: ${response.status}`);
  }

  return response.json();
}

async function createAgent(apiKey, payload) {
  const response = await elevenFetch("/v1/convai/agents/create", apiKey, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create ElevenLabs agent: ${response.status} ${text}`);
  }

  return response.json();
}

async function listTools(apiKey) {
  const response = await elevenFetch("/v1/convai/tools?page_size=100", apiKey);
  if (!response.ok) {
    throw new Error(`Failed to fetch ElevenLabs tools: ${response.status}`);
  }

  const body = await response.json();
  return body.tools ?? [];
}

async function createTool(apiKey, tool) {
  const response = await elevenFetch("/v1/convai/tools", apiKey, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      tool_config: {
        type: "client",
        name: tool.name,
        description: tool.description,
        expects_response: false,
        parameters: tool.parameters
      }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create ElevenLabs tool ${tool.name}: ${response.status} ${text}`);
  }

  return response.json();
}

async function updateAgent(agentId, apiKey, payload) {
  const response = await elevenFetch(`/v1/convai/agents/${agentId}`, apiKey, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to update ElevenLabs agent: ${response.status} ${text}`);
  }

  return response.json();
}

function buildWorkflowWithTools(workflow, toolIds) {
  const nextNodes = Object.fromEntries(
    Object.entries(workflow.nodes ?? {}).map(([nodeId, node]) => {
      if (node?.type !== "override_agent") {
        return [nodeId, node];
      }

      const currentConversationConfig = node.conversation_config ?? {};
      const currentAgent = currentConversationConfig.agent ?? {};
      const currentPrompt = currentAgent.prompt ?? {};

      return [
        nodeId,
        {
          ...node,
          additional_tool_ids: toolIds,
          conversation_config: {
            ...currentConversationConfig,
            agent: {
              ...currentAgent,
              prompt: {
                ...currentPrompt,
                tool_ids: toolIds
              }
            }
          }
        }
      ];
    })
  );

  return {
    ...workflow,
    nodes: nextNodes
  };
}

async function ensureTools(apiKey, manifest) {
  const tools = await listTools(apiKey);
  const byName = new Map(tools.map((tool) => [tool.tool_config?.name, tool]));
  const resolved = [];

  for (const tool of manifest.tools) {
    if (byName.has(tool.name)) {
      resolved.push(byName.get(tool.name));
      continue;
    }

    const created = await createTool(apiKey, tool);
    resolved.push(created);
  }

  return resolved;
}

function buildAgentSpecs(agentConfigSource, manifest) {
  return {
    intake: {
      name: "Refund Raider Intake",
      envName: "ELEVENLABS_INTAKE_AGENT_ID",
      firstMessage: parseExportedString(agentConfigSource, "refundRaiderIntakeAgentFirstMessage"),
      prompt: parseExportedString(agentConfigSource, "refundRaiderIntakeAgentPrompt"),
      workflowPath: path.join(root, "workflow", "refundRaiderWorkflow-v2-intake.json"),
      toolNames: [...manifest.intakeToolNames]
    },
    case: {
      name: "Refund Raider",
      envName: "ELEVENLABS_CASE_AGENT_ID",
      firstMessage: parseExportedString(agentConfigSource, "refundRaiderAgentFirstMessage"),
      prompt: parseExportedString(agentConfigSource, "refundRaiderAgentPrompt"),
      workflowPath: path.join(root, "workflow", "refundRaiderWorkflow-v2-case.json"),
      toolNames: [...manifest.caseToolNames, ...manifest.browserToolNames]
    }
  };
}

async function ensureSplitAgents(apiKey, sharedAgentId, specs, dryRun) {
  const result = {
    intakeAgentId: process.env.ELEVENLABS_INTAKE_AGENT_ID || null,
    caseAgentId: process.env.ELEVENLABS_CASE_AGENT_ID || sharedAgentId
  };

  if (!result.intakeAgentId) {
    if (dryRun) {
      result.intakeAgentId = "__PENDING_CREATE__";
      return result;
    }

    const created = await createAgent(apiKey, {
      name: specs.intake.name,
      conversation_config: {
        agent: {
          first_message: specs.intake.firstMessage,
          prompt: {
            prompt: specs.intake.prompt
          }
        }
      }
    });
    result.intakeAgentId = created.agent_id;
  }

  return result;
}

async function syncAgent({
  apiKey,
  agentId,
  spec,
  manifest,
  resolvedTools,
  dryRun
}) {
  const workflow = JSON.parse(await readFile(spec.workflowPath, "utf8"));
  const currentAgent = await getCurrentAgent(agentId, apiKey);
  const currentConversationConfig = currentAgent.conversation_config ?? {};
  const currentAgentConfig = currentConversationConfig.agent ?? {};
  const currentPromptConfig = currentAgentConfig.prompt ?? {};
  const { tools: _ignoredTools, ...safePromptConfig } = currentPromptConfig;

  const toolIds = resolvedTools
    .filter((tool) => spec.toolNames.includes(tool.tool_config?.name))
    .map((tool) => tool.id);
  const toolNames = resolvedTools
    .filter((tool) => spec.toolNames.includes(tool.tool_config?.name))
    .map((tool) => tool.tool_config?.name)
    .filter(Boolean);
  const liveWorkflow = buildWorkflowWithTools(workflow, toolIds);

  const payload = {
    name: spec.name,
    conversation_config: {
      ...currentConversationConfig,
      agent: {
        ...currentAgentConfig,
        first_message: spec.firstMessage,
        prompt: {
          ...safePromptConfig,
          prompt: spec.prompt,
          tool_ids: toolIds
        }
      }
    },
    workflow: liveWorkflow
  };

  const summary = {
    agentId,
    name: payload.name,
    expectedToolNames: spec.toolNames,
    attachedToolNames: toolNames,
    toolCount: toolIds.length,
    workflow: summariseWorkflow(liveWorkflow)
  };

  if (dryRun) {
    return summary;
  }

  const updated = await updateAgent(agentId, apiKey, payload);
  return {
    ...summary,
    agentId: updated.agent_id
  };
}

async function main() {
  await loadEnvFiles();

  const dryRun = process.argv.includes("--dry-run");
  const provisionSplit = process.argv.includes("--provision-split");
  const apiKey = getRequiredEnv("ELEVENLABS_API_KEY");
  const agentId = getRequiredEnv("ELEVENLABS_AGENT_ID");
  const manifest = JSON.parse(await readFile(toolManifestPath, "utf8"));
  const agentConfigSource = await readFile(agentConfigPath, "utf8");
  const resolvedTools = await ensureTools(apiKey, manifest);
  const specs = buildAgentSpecs(agentConfigSource, manifest);

  if (!provisionSplit && !process.env.ELEVENLABS_INTAKE_AGENT_ID && !process.env.ELEVENLABS_CASE_AGENT_ID) {
    const result = await syncAgent({
      apiKey,
      agentId,
      spec: specs.case,
      manifest,
      resolvedTools,
      dryRun
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const split = await ensureSplitAgents(apiKey, agentId, specs, dryRun);
  const intakeResult =
    split.intakeAgentId === "__PENDING_CREATE__"
      ? {
          agentId: "__PENDING_CREATE__",
          name: specs.intake.name,
          expectedToolNames: specs.intake.toolNames,
          attachedToolNames: specs.intake.toolNames,
          toolCount: specs.intake.toolNames.length,
          workflow: summariseWorkflow(
            JSON.parse(await readFile(specs.intake.workflowPath, "utf8"))
          ),
          note: "Running without --dry-run will create and sync the intake agent."
        }
      : await syncAgent({
          apiKey,
          agentId: split.intakeAgentId,
          spec: specs.intake,
          manifest,
          resolvedTools,
          dryRun
        });
  const caseResult = await syncAgent({
    apiKey,
    agentId: split.caseAgentId,
    spec: specs.case,
    manifest,
    resolvedTools,
    dryRun
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        splitAgents: {
          intake: intakeResult,
          case: caseResult
        }
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
