import { execFile } from "node:child_process";
import path from "node:path";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { promisify } from "node:util";
import { env } from "@/lib/config/env";

const execFileAsync = promisify(execFile);

function normalizeExtractedText(value: string | null | undefined) {
  const normalized = (value ?? "")
    .replace(/\0/g, "")
    .replace(/\r/g, "\n")
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();

  if (normalized.length < 8) {
    return null;
  }

  return normalized.slice(0, 12000);
}

function isTextMime(mimeType: string | null) {
  return Boolean(mimeType?.startsWith("text/")) || mimeType === "message/rfc822";
}

function isRichTextExtension(filePath: string) {
  return [".eml", ".txt", ".md", ".rtf", ".html", ".htm"].includes(path.extname(filePath).toLowerCase());
}

function shouldUseManagedOcr(fileName: string, mimeType: string | null) {
  if (isTextMime(mimeType) || isRichTextExtension(fileName)) {
    return false;
  }

  return /\.(pdf|png|jpe?g|webp|gif|heic|heif)$/i.test(fileName) || Boolean(mimeType?.startsWith("image/")) || mimeType === "application/pdf";
}

function stripMarkdownNoise(value: string) {
  return value
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[[^\]]+]\(([^)]+)\)/g, "$1")
    .replace(/[*#>`_~-]+/g, " ");
}

async function extractWithMistral(fileName: string, mimeType: string | null, buffer: Buffer) {
  if (!env.mistralApiKey) {
    return null;
  }

  const formData = new FormData();
  formData.append("purpose", "ocr");
  formData.append(
    "file",
    new Blob([new Uint8Array(buffer)], { type: mimeType ?? "application/octet-stream" }),
    fileName
  );

  const uploadResponse = await fetch("https://api.mistral.ai/v1/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.mistralApiKey}`
    },
    body: formData
  });

  const uploadBody = (await uploadResponse.json().catch(() => ({}))) as { id?: string; error?: string };
  if (!uploadResponse.ok || !uploadBody.id) {
    throw new Error(typeof uploadBody.error === "string" ? uploadBody.error : "Failed to upload file for OCR.");
  }

  const ocrResponse = await fetch("https://api.mistral.ai/v1/ocr", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.mistralApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "mistral-ocr-latest",
      document: {
        file_id: uploadBody.id,
        type: "file"
      },
      include_image_base64: false
    })
  });

  const ocrBody = (await ocrResponse.json().catch(() => ({}))) as {
    pages?: Array<{ markdown?: string }>;
    error?: string;
  };
  if (!ocrResponse.ok) {
    throw new Error(typeof ocrBody.error === "string" ? ocrBody.error : "OCR processing failed.");
  }

  const text = (ocrBody.pages ?? [])
    .map((page) => page.markdown ?? "")
    .map(stripMarkdownNoise)
    .join("\n\n");

  return normalizeExtractedText(text);
}

async function runCommand(command: string, args: string[]) {
  const result = await execFileAsync(command, args, {
    maxBuffer: 12 * 1024 * 1024
  });

  return `${result.stdout ?? ""}`.trim();
}

async function extractImageLocally(fileName: string, buffer: Buffer) {
  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), "refund-raider-local-ocr-"));
  const imagePath = path.join(tempDirectory, path.basename(fileName));

  try {
    await writeFile(imagePath, buffer);
    const text = await runCommand("/opt/homebrew/bin/tesseract", [imagePath, "stdout", "--psm", "6"]).catch(
      async () => runCommand("tesseract", [imagePath, "stdout", "--psm", "6"])
    );
    return normalizeExtractedText(text);
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

async function extractPdfLocally(fileName: string, buffer: Buffer) {
  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), "refund-raider-local-pdf-"));
  const pdfPath = path.join(tempDirectory, path.basename(fileName));

  try {
    await writeFile(pdfPath, buffer);
    await runCommand("qlmanage", ["-t", "-s", "2400", "-o", tempDirectory, pdfPath]);
    const entries = await readdir(tempDirectory);
    const previewPath = entries
      .map((entry) => path.join(tempDirectory, entry))
      .find((entry) => /\.(png|jpg|jpeg)$/i.test(entry));

    if (!previewPath) {
      return null;
    }

    const text = await runCommand("/opt/homebrew/bin/tesseract", [previewPath, "stdout", "--psm", "6"]).catch(
      async () => runCommand("tesseract", [previewPath, "stdout", "--psm", "6"])
    );
    return normalizeExtractedText(text);
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

function decodeTextBuffer(buffer: Buffer) {
  return normalizeExtractedText(buffer.toString("utf8"));
}

export async function extractTextFromFileBuffer(
  fileName: string,
  mimeType: string | null,
  buffer: Buffer
) {
  if (isTextMime(mimeType) || isRichTextExtension(fileName)) {
    return decodeTextBuffer(buffer);
  }

  if (shouldUseManagedOcr(fileName, mimeType)) {
    const managed = await extractWithMistral(fileName, mimeType, buffer);
    if (managed) {
      return managed;
    }

    if (mimeType === "application/pdf" || /\.pdf$/i.test(fileName)) {
      return extractPdfLocally(fileName, buffer).catch(() => null);
    }

    return extractImageLocally(fileName, buffer).catch(() => null);
  }

  return null;
}

export async function extractTextFromStoredFile(filePath: string, mimeType: string | null) {
  const buffer = await readFile(filePath);
  return extractTextFromFileBuffer(path.basename(filePath), mimeType, buffer);
}
