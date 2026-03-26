import os from "node:os";
import path from "node:path";

export function getLocalDataRoot() {
  if (process.env.RR_LOCAL_DATA_DIR) {
    return process.env.RR_LOCAL_DATA_DIR;
  }

  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), "refund-raider-data");
  }

  return path.join(process.cwd(), ".data");
}
