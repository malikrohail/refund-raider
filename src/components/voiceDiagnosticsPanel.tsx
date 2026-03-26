"use client";

import { useState } from "react";
import type { VoiceSessionDebugState } from "@/lib/agent/voiceSessionDiagnostics";

type VoiceDiagnosticsPanelProps = {
  title: string;
  debugState: VoiceSessionDebugState;
};

export function VoiceDiagnosticsPanel({
  title,
  debugState
}: VoiceDiagnosticsPanelProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const payload = JSON.stringify(debugState, null, 2);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(payload);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  return (
    <details className="rounded-[1.35rem] border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm text-slate-700">
      <summary className="cursor-pointer font-semibold text-slate-900">
        {title}
      </summary>

      <div className="mt-4 grid gap-3">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Agent</div>
            <div className="mt-2 text-sm font-semibold text-slate-900">{debugState.agentId}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Preferred transport</div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              {debugState.preferredTransport ?? "unknown"}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Active attempt</div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              {debugState.transport ? `${debugState.transport} via ${debugState.authMode}` : "none"}
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Mic</div>
            <div className="mt-2 text-sm font-semibold text-slate-900">{debugState.micPermission}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Conversation</div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              {debugState.conversationId ?? "not connected"}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Last error</div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              {debugState.errorMessage ?? "none"}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Disconnect</div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              {debugState.disconnectDetails
                ? `${debugState.disconnectDetails.reason}${debugState.disconnectDetails.closeCode ? ` · ${debugState.disconnectDetails.closeCode}` : ""}`
                : "none"}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
          <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Status timeline</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {debugState.statusTransitions.length > 0 ? (
              debugState.statusTransitions.map((entry) => (
                <span key={`${entry.status}-${entry.at}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {entry.status}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-500">No status transitions captured yet.</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              void handleCopy();
            }}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900"
          >
            Copy JSON log
          </button>
          <span className="text-xs text-slate-500">
            {copyState === "copied"
              ? "Copied."
              : copyState === "error"
                ? "Copy failed."
                : "Includes transport choice, disconnect details, and raw SDK/debug events."}
          </span>
        </div>

        <pre className="max-h-80 overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
          {payload}
        </pre>
      </div>
    </details>
  );
}
