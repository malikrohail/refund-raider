import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractTextFromFileBuffer } from "../../src/server/storage/documentTextExtraction";

describe("extractTextFromFileBuffer", () => {
  it("reads plain text files directly", async () => {
    const text = await extractTextFromFileBuffer(
      "order-email.txt",
      "text/plain",
      Buffer.from("Order placed on March 18, 2026\nMy item arrived damaged.")
    );

    expect(text).toContain("Order placed on March 18, 2026");
  });

  it("extracts OCR text from an uploaded image", async (context) => {
    const tempDirectory = mkdtempSync(path.join(os.tmpdir(), "refund-raider-ocr-test-"));

    try {
      const htmlPath = path.join(tempDirectory, "sample.html");
      writeFileSync(
        htmlPath,
        '<html><body style="font-size:64px;font-family:Arial">ORDER PLACED<br>BROKEN ITEM<br>REFUND REQUEST</body></html>',
        "utf8"
      );

      try {
        execFileSync("qlmanage", ["-t", "-s", "2400", "-o", tempDirectory, htmlPath], {
          stdio: "ignore"
        });
      } catch {
        context.skip("qlmanage preview generation is unavailable in this runtime.");
        return;
      }

      const pngPath = `${htmlPath}.png`;
      const pngBuffer = readFileSync(pngPath);
      const text = await extractTextFromFileBuffer("proof.png", "image/png", pngBuffer);

      expect(text).toContain("BROKEN ITEM");
      expect(text).toContain("REFUND REQUEST");
    } finally {
      rmSync(tempDirectory, { recursive: true, force: true });
    }
  });
});
