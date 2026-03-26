import { mkdirSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const entry = path.join(process.cwd(), "submission-videos", "studio", "src", "index.tsx");
const root = path.join(process.cwd(), "submission-videos");
const videos = [
  { id: "v01-clean-winner", thumbnailFrame: 1685 },
  { id: "v02-frustration-to-relief", thumbnailFrame: 10 },
  { id: "v03-voice-magic", thumbnailFrame: 15 },
  { id: "v04-challenge-format", thumbnailFrame: 10 }
];
const requestedIds = process.argv.slice(2);
const selectedVideos = requestedIds.length
  ? videos.filter((video) => requestedIds.includes(video.id))
  : videos;

if (requestedIds.length && selectedVideos.length === 0) {
  throw new Error(`No supported submission video ids found in: ${requestedIds.join(", ")}`);
}

for (const { id, thumbnailFrame } of selectedVideos) {
  const outDir = path.join(root, id);
  mkdirSync(outDir, { recursive: true });

  execFileSync("npx", ["remotion", "render", entry, id, path.join(outDir, "video.mp4")], {
    stdio: "inherit",
    cwd: process.cwd()
  });

  execFileSync(
    "npx",
    ["remotion", "still", entry, id, path.join(outDir, "thumbnail.png"), "--frame", String(thumbnailFrame)],
    {
      stdio: "inherit",
      cwd: process.cwd()
    }
  );
}
