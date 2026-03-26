import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

function loadFileEnv() {
  const envMap = {};

  for (const envFileName of [".env", ".env.local"]) {
    const envFilePath = path.join(process.cwd(), envFileName);
    if (!existsSync(envFilePath)) {
      continue;
    }

    const source = readFileSync(envFilePath, "utf8");
    for (const rawLine of source.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#") || !line.includes("=")) {
        continue;
      }

      const separatorIndex = line.indexOf("=");
      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();

      if (value) {
        envMap[key] = value;
      }
    }
  }

  return envMap;
}

function readEnv(name) {
  const runtimeValue = process.env[name];
  if (runtimeValue && runtimeValue.trim().length > 0) {
    return runtimeValue.trim();
  }

  return loadFileEnv()[name] ?? "";
}

const apiKey = readEnv("ELEVENLABS_API_KEY");

if (!apiKey) {
  throw new Error("ELEVENLABS_API_KEY is required.");
}

const videosRoot = path.join(process.cwd(), "submission-videos");
const supportedIds = [
  "v01-clean-winner",
  "v02-frustration-to-relief",
  "v03-voice-magic",
  "v04-challenge-format"
];
const requestedIds = process.argv.slice(2);
const ids = requestedIds.length
  ? requestedIds.filter((id) => supportedIds.includes(id))
  : supportedIds;

if (requestedIds.length && ids.length === 0) {
  throw new Error(`No supported submission video ids found in: ${requestedIds.join(", ")}`);
}

const voiceId = readEnv("ELEVENLABS_VOICE_ID") || "JBFqnCBsd6RMkjVDRZzb";
const modelId = readEnv("ELEVENLABS_TTS_MODEL_ID") || "eleven_multilingual_v2";

async function generateVoiceover(id) {
  const targetDir = path.join(process.cwd(), "public", "submission-videos", "audio", id);
  mkdirSync(targetDir, { recursive: true });
  const text = readFileSync(path.join(videosRoot, id, "voiceover.txt"), "utf8").trim();
  const audio = await synthesizeSpeech(text);
  writeFileSync(path.join(targetDir, "voiceover.mp3"), audio);
}

async function synthesizeSpeech(text) {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg"
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.78,
        style: 0.2,
        speed: 1
      },
      output_format: "mp3_44100_128"
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`TTS failed: ${response.status} ${body}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function generateSceneVoiceovers(id) {
  const sceneVoiceoverPath = path.join(videosRoot, id, "scene-voiceovers.json");
  if (!existsSync(sceneVoiceoverPath)) {
    return;
  }

  const scenes = JSON.parse(readFileSync(sceneVoiceoverPath, "utf8"));
  const targetDir = path.join(process.cwd(), "public", "submission-videos", "audio", id, "scenes");
  mkdirSync(targetDir, { recursive: true });

  for (const [index, scene] of scenes.entries()) {
    const audio = await synthesizeSpeech(scene.text);
    const fileName = `${String(index + 1).padStart(2, "0")}-${scene.sceneId}.mp3`;
    writeFileSync(path.join(targetDir, fileName), audio);
  }
}

async function generateMusic(id) {
  const prompt = readFileSync(path.join(videosRoot, id, "music-prompt.txt"), "utf8").trim();
  const response = await fetch("https://api.elevenlabs.io/v1/music", {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg"
    },
    body: JSON.stringify({
      prompt,
      music_length_ms: 60000
    })
  });

  if (!response.ok) {
    const body = await response.text();
    console.warn(`Music generation failed for ${id}: ${response.status} ${body}`);
    return;
  }

  const audio = Buffer.from(await response.arrayBuffer());
  const targetDir = path.join(process.cwd(), "public", "submission-videos", "audio", id);
  mkdirSync(targetDir, { recursive: true });
  writeFileSync(path.join(targetDir, "music.mp3"), audio);
}

for (const id of ids) {
  await generateVoiceover(id);
  await generateSceneVoiceovers(id);
  await generateMusic(id);
  console.log(`Generated ElevenLabs audio for ${id}`);
}
