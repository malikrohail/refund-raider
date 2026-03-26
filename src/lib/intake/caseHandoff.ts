import type { IntakeSource } from "@/lib/intake/types";

export const INTAKE_CASE_HANDOFF_KEY = "refund-raider:last-intake-handoff";

export type IntakeCaseHandoff = {
  caseId: string;
  source: IntakeSource;
  merchantName: string;
  createdAt: string;
};

export function buildCaseWorkspacePath(caseId: string) {
  return `/cases/${caseId}`;
}

export function persistCaseHandoff(payload: IntakeCaseHandoff) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(INTAKE_CASE_HANDOFF_KEY, JSON.stringify(payload));
}

export function readCaseHandoff(): IntakeCaseHandoff | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(INTAKE_CASE_HANDOFF_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as IntakeCaseHandoff;
    if (!parsed.caseId || !parsed.createdAt) {
      return null;
    }

    const ageMs = Date.now() - new Date(parsed.createdAt).getTime();
    if (!Number.isFinite(ageMs) || ageMs > 10 * 60_000) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function clearCaseHandoff() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(INTAKE_CASE_HANDOFF_KEY);
}
