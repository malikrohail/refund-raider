import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { extractTextFromStoredFile } from "@/server/storage/documentTextExtraction";
import { getLocalDataRoot } from "@/server/storage/localDataRoot";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function saveUploadedFile(caseId: string, file: File) {
  const uploadsDirectory = path.join(getLocalDataRoot(), "uploads", caseId);
  await mkdir(uploadsDirectory, { recursive: true });

  const safeFileName = `${crypto.randomUUID()}-${sanitizeFileName(file.name || "upload.bin")}`;
  const storagePath = path.join(uploadsDirectory, safeFileName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(storagePath, buffer);
  const sourceText = await extractTextFromStoredFile(storagePath, file.type || null);

  return {
    storagePath,
    sourceText
  };
}
