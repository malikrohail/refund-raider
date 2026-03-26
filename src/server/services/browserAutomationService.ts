import type {
  BrowserCommandCompletionRequest,
  BrowserExtensionHandshakeRequest,
  BrowserSnapshotRequest,
  QueueBrowserCommandRequest
} from "@/lib/contracts/api";
import { refundRaiderRepository } from "@/server/repositories/refundRaiderRepository";
import { ConflictError, NotFoundError } from "@/server/errors";

async function assertAutomationSessionOwnership(userId: string, sessionId: string) {
  const session = await refundRaiderRepository.getAutomationSession(sessionId);
  await refundRaiderRepository.getCase(session.caseId, userId);
  return session;
}

export async function getAutomationStateForUser(userId: string, caseId: string) {
  const detail = await refundRaiderRepository.getCaseDetail(caseId, userId);

  return {
    automationSession: detail.currentAutomationSession,
    browserSnapshots: detail.browserSnapshots,
    browserCommands: detail.browserCommands,
    automationEvents: detail.automationEvents
  };
}

export async function getAutomationWorkspaceForUser(userId: string, caseId: string) {
  return getAutomationStateForUser(userId, caseId);
}

export async function createAutomationSessionForUser(userId: string, caseId: string) {
  await refundRaiderRepository.getCase(caseId, userId);

  const existing = await refundRaiderRepository.getLatestAutomationSession(caseId);
  if (existing && existing.status !== "failed" && existing.status !== "completed") {
    return existing;
  }

  const session = await refundRaiderRepository.createAutomationSession({
    caseId,
    status: "pending",
    runtime: "browser_extension",
    tabId: null,
    pageUrl: null,
    pageTitle: null,
    lastHeartbeatAt: null
  });

  await refundRaiderRepository.createAutomationEvent({
    automationSessionId: session.id,
    caseId,
    eventType: "session_created",
    payload: {
      runtime: session.runtime
    }
  });

  return session;
}

export async function openAutomationSessionForUser(userId: string, caseId: string) {
  const existing = await refundRaiderRepository.getLatestAutomationSession(caseId);
  if (existing && existing.status !== "failed" && existing.status !== "completed") {
    await assertAutomationSessionOwnership(userId, existing.id);
    return {
      automationSession: existing,
      created: false
    };
  }

  return {
    automationSession: await createAutomationSessionForUser(userId, caseId),
    created: true
  };
}

export async function attachBrowserToSessionForUser(
  userId: string,
  sessionId: string,
  payload: BrowserExtensionHandshakeRequest & { snapshot?: BrowserSnapshotRequest | null }
) {
  const session = await assertAutomationSessionOwnership(userId, sessionId);
  const now = new Date().toISOString();

  const updatedSession = await refundRaiderRepository.updateAutomationSession(sessionId, {
    status: "connected",
    tabId: payload.tabId ?? session.tabId,
    pageUrl: payload.pageUrl ?? session.pageUrl,
    pageTitle: payload.pageTitle ?? session.pageTitle,
    lastHeartbeatAt: now
  });

  await refundRaiderRepository.createAutomationEvent({
    automationSessionId: sessionId,
    caseId: session.caseId,
    eventType: "extension_connected",
    payload: {
      tabId: payload.tabId ?? null,
      pageUrl: payload.pageUrl ?? null,
      pageTitle: payload.pageTitle ?? null
    }
  });

  if (payload.snapshot) {
    await recordBrowserSnapshotForUser(userId, sessionId, payload.snapshot);
  }

  return updatedSession;
}

export async function handshakeAutomationSessionForUser(
  userId: string,
  sessionId: string,
  payload: BrowserExtensionHandshakeRequest
) {
  return attachBrowserToSessionForUser(userId, sessionId, payload);
}

export async function recordBrowserSnapshotForUser(
  userId: string,
  sessionId: string,
  payload: BrowserSnapshotRequest
) {
  const session = await assertAutomationSessionOwnership(userId, sessionId);
  const snapshot = await refundRaiderRepository.createBrowserSnapshot({
    automationSessionId: sessionId,
    caseId: session.caseId,
    pageUrl: payload.pageUrl,
    pageTitle: payload.pageTitle ?? null,
    visibleText: payload.visibleText ?? null,
    domSummary: payload.domSummary ?? null,
    screenshotDataUrl: payload.screenshotDataUrl ?? null,
    metadata: payload.metadata ?? {}
  });

  await refundRaiderRepository.updateAutomationSession(sessionId, {
    status: "observing",
    pageUrl: payload.pageUrl,
    pageTitle: payload.pageTitle ?? session.pageTitle,
    lastHeartbeatAt: new Date().toISOString()
  });

  await refundRaiderRepository.createAutomationEvent({
    automationSessionId: sessionId,
    caseId: session.caseId,
    eventType: "snapshot_updated",
    payload: {
      snapshotId: snapshot.id,
      pageUrl: snapshot.pageUrl,
      pageTitle: snapshot.pageTitle
    }
  });

  return snapshot;
}

export async function queueBrowserCommandForUser(
  userId: string,
  sessionId: string,
  payload: QueueBrowserCommandRequest
) {
  const session = await assertAutomationSessionOwnership(userId, sessionId);
  const command = await refundRaiderRepository.createBrowserCommand({
    automationSessionId: sessionId,
    caseId: session.caseId,
    actionType: payload.actionType,
    status: "pending",
    selector: payload.selector ?? null,
    textValue: payload.textValue ?? null,
    targetUrl: payload.targetUrl ?? null,
    waitForText: payload.waitForText ?? null,
    description: payload.description,
    resultSummary: null,
    metadata: payload.metadata ?? {},
    completedAt: null
  });

  await refundRaiderRepository.updateAutomationSession(sessionId, {
    status: "ready"
  });

  await refundRaiderRepository.createAutomationEvent({
    automationSessionId: sessionId,
    caseId: session.caseId,
    eventType: "command_queued",
    payload: {
      commandId: command.id,
      actionType: command.actionType,
      description: command.description
    }
  });

  return command;
}

export async function getAutomationSessionStateForUser(userId: string, sessionId: string) {
  const session = await assertAutomationSessionOwnership(userId, sessionId);
  const detail = await refundRaiderRepository.getCaseDetail(session.caseId, userId);

  return {
    automationSession: session,
    browserSnapshots: detail.browserSnapshots.filter(
      (snapshot) => snapshot.automationSessionId === sessionId
    ),
    browserCommands: detail.browserCommands.filter(
      (command) => command.automationSessionId === sessionId
    ),
    automationEvents: detail.automationEvents.filter(
      (event) => event.automationSessionId === sessionId
    )
  };
}

export async function claimNextBrowserCommandForUser(userId: string, sessionId: string) {
  await assertAutomationSessionOwnership(userId, sessionId);
  const command = await refundRaiderRepository.claimNextBrowserCommand(sessionId);

  if (command) {
    await refundRaiderRepository.updateAutomationSession(sessionId, {
      status: "executing",
      lastHeartbeatAt: new Date().toISOString()
    });
  }

  return command;
}

export async function completeBrowserCommandForUser(
  userId: string,
  commandId: string,
  payload: BrowserCommandCompletionRequest,
  sessionIdOverride?: string
) {
  const command = await refundRaiderRepository.getBrowserCommand(commandId);
  const session = await assertAutomationSessionOwnership(userId, command.automationSessionId);

  if (sessionIdOverride && command.automationSessionId !== sessionIdOverride) {
    throw new NotFoundError("Browser command not found for this session");
  }

  const updatedCommand = await refundRaiderRepository.updateBrowserCommand(commandId, {
    status: payload.status,
    resultSummary: payload.resultSummary ?? null,
    metadata: {
      ...command.metadata,
      ...(payload.metadata ?? {})
    },
    completedAt: new Date().toISOString()
  });

  await refundRaiderRepository.updateAutomationSession(command.automationSessionId, {
    status: payload.status === "completed" ? "observing" : "failed",
    lastHeartbeatAt: new Date().toISOString()
  });

  await refundRaiderRepository.createAutomationEvent({
    automationSessionId: command.automationSessionId,
    caseId: session.caseId,
    eventType: payload.status === "completed" ? "command_completed" : "command_failed",
    payload: {
      commandId,
      resultSummary: payload.resultSummary ?? null
    }
  });

  const actionRunId = typeof updatedCommand.metadata.actionRunId === "string" ? updatedCommand.metadata.actionRunId : null;
  if (actionRunId) {
    await refundRaiderRepository.updateActionRun(actionRunId, {
      status: payload.status === "completed" ? "completed" : "failed",
      errorMessage: payload.status === "failed" ? payload.resultSummary ?? "Browser command failed." : null,
      completedAt: payload.status === "completed" ? new Date().toISOString() : null
    });
  }

  return updatedCommand;
}

export async function getAutomationEventsForUser(userId: string, sessionId: string) {
  await assertAutomationSessionOwnership(userId, sessionId);
  return refundRaiderRepository.listAutomationEvents(sessionId);
}

export async function listAutomationEventsForUser(userId: string, sessionId: string) {
  return getAutomationEventsForUser(userId, sessionId);
}

export async function assertBrowserRuntimeReadyForCase(userId: string, caseId: string) {
  const session = await refundRaiderRepository.getLatestAutomationSession(caseId);
  if (!session) {
    throw new ConflictError("Start a browser automation session before running browser commands.");
  }

  await assertAutomationSessionOwnership(userId, session.id);

  if (session.status === "pending") {
    throw new ConflictError("Connect the browser extension to this session before running browser commands.");
  }

  return session;
}
