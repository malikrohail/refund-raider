import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
});

describe("getLocalDataRoot", () => {
  it("uses the repo .data directory locally", async () => {
    delete process.env.VERCEL;
    delete process.env.RR_LOCAL_DATA_DIR;

    const { getLocalDataRoot } = await import("../../src/server/storage/localDataRoot");
    expect(getLocalDataRoot()).toBe(path.join(process.cwd(), ".data"));
  });

  it("uses a writable tmp directory on Vercel", async () => {
    process.env.VERCEL = "1";
    delete process.env.RR_LOCAL_DATA_DIR;

    const { getLocalDataRoot } = await import("../../src/server/storage/localDataRoot");
    expect(getLocalDataRoot()).toBe(path.join(os.tmpdir(), "refund-raider-data"));
  });

  it("allows an explicit override", async () => {
    process.env.RR_LOCAL_DATA_DIR = "/tmp/custom-refund-raider-data";

    const { getLocalDataRoot } = await import("../../src/server/storage/localDataRoot");
    expect(getLocalDataRoot()).toBe("/tmp/custom-refund-raider-data");
  });
});
