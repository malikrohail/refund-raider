"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import type {
  GmailConnectionStatusResponseData,
  GmailSearchResponseData,
  GmailSearchResult,
  IntakeSuggestion,
  ParseIntakeResponseData,
  ParseIntakeUploadResponseData
} from "@/lib/contracts/api";
import { runCaseCreationWorkflow } from "@/lib/intake/runCaseCreationWorkflow";
import {
  buildCaseWorkspacePath,
  persistCaseHandoff
} from "@/lib/intake/caseHandoff";
import {
  initialIntakeFormState,
  type IntakeFormState,
  type IntakeSource,
  type IntakeSubmitStage
} from "@/lib/intake/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SessionUserSnapshot = {
  email: string;
  mode: "demo" | "authenticated";
};

type GmailStatus = {
  available: boolean;
  connected: boolean;
  email: string | null;
  requiresAuth: boolean;
};

type IntakeWorkspaceContextValue = {
  sessionUser: SessionUserSnapshot;
  authAvailable: boolean;
  gmailAvailable: boolean;
  form: IntakeFormState;
  setForm: React.Dispatch<React.SetStateAction<IntakeFormState>>;
  autopilotContext: string;
  setAutopilotContext: React.Dispatch<React.SetStateAction<string>>;
  file: File | null;
  setFile: React.Dispatch<React.SetStateAction<File | null>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  submitStage: IntakeSubmitStage;
  isAutofillRunning: boolean;
  suggestion: IntakeSuggestion | null;
  setSuggestion: React.Dispatch<React.SetStateAction<IntakeSuggestion | null>>;
  gmailStatus: GmailStatus | null;
  gmailQuery: string;
  setGmailQuery: React.Dispatch<React.SetStateAction<string>>;
  gmailResults: GmailSearchResult[];
  isSearchingGmail: boolean;
  intakeSource: IntakeSource;
  setIntakeSource: React.Dispatch<React.SetStateAction<IntakeSource>>;
  gmailFlash: string | null;
  authFlash: string | null;
  hasAutopilotContext: boolean;
  isValid: boolean;
  captureVoiceProblem: (rawText: string) => Promise<IntakeSuggestion | null>;
  createCaseFromCurrentIntake: () => Promise<{ caseId: string }>;
  runAutofill: () => Promise<IntakeSuggestion>;
  searchGmailResults: (query: string) => Promise<GmailSearchResult[]>;
  useGmailMessageById: (messageId: string) => Promise<void>;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleAppSignIn: () => Promise<void>;
  handleAppSignOut: () => Promise<void>;
  handleConnectGmail: () => void;
  handleDisconnectGmail: () => Promise<void>;
  handleSearchGmail: () => Promise<void>;
};

const IntakeWorkspaceContext = createContext<IntakeWorkspaceContextValue | null>(null);

function applySuggestionToForm(current: IntakeFormState, suggestion: IntakeSuggestion): IntakeFormState {
  return {
    ...current,
    merchantName: suggestion.merchantName || current.merchantName,
    merchantUrl: suggestion.merchantUrl ?? current.merchantUrl ?? "",
    issueSummary: suggestion.issueSummary || current.issueSummary,
    issueType: suggestion.issueType,
    desiredOutcome: suggestion.desiredOutcome,
    paymentMethod: suggestion.paymentMethod,
    purchaseDate: suggestion.purchaseDate ?? current.purchaseDate ?? "",
    merchantContactEmail: suggestion.merchantContactEmail ?? current.merchantContactEmail ?? ""
  };
}

export function IntakeWorkspaceProvider({
  initialSessionUser,
  authAvailable,
  gmailAvailable,
  children
}: {
  initialSessionUser: SessionUserSnapshot;
  authAvailable: boolean;
  gmailAvailable: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const sessionUser = initialSessionUser;
  const [form, setForm] = useState<IntakeFormState>(initialIntakeFormState);
  const [autopilotContext, setAutopilotContext] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitStage, setSubmitStage] = useState<IntakeSubmitStage>("idle");
  const [isAutofillRunning, setIsAutofillRunning] = useState(false);
  const [suggestion, setSuggestion] = useState<IntakeSuggestion | null>(null);
  const [gmailStatus, setGmailStatus] = useState<GmailStatus | null>(null);
  const [gmailQuery, setGmailQuery] = useState("");
  const [gmailResults, setGmailResults] = useState<GmailSearchResult[]>([]);
  const [isSearchingGmail, setIsSearchingGmail] = useState(false);
  const [intakeSource, setIntakeSource] = useState<IntakeSource>("paste");
  const [gmailFlash, setGmailFlash] = useState<string | null>(null);
  const [authFlash, setAuthFlash] = useState<string | null>(null);

  const hasAutopilotContext = useMemo(() => {
    return autopilotContext.trim().length > 0 || form.merchantUrl.trim().length > 0 || Boolean(file);
  }, [autopilotContext, file, form.merchantUrl]);

  const isValid = useMemo(() => {
    return (
      (form.merchantName.trim().length > 0 && form.issueSummary.trim().length > 0) || hasAutopilotContext
    );
  }, [form.issueSummary, form.merchantName, hasAutopilotContext]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setGmailFlash(params.get("gmail"));
    setAuthFlash(params.get("auth"));
  }, []);

  useEffect(() => {
    if (sessionUser.mode !== "authenticated") {
      return;
    }

    let isMounted = true;

    async function loadStatus() {
      const response = await fetch("/api/v1/integrations/gmail/status");
      const body = (await response.json()) as { data?: GmailConnectionStatusResponseData };
      if (!response.ok || !body.data || !isMounted) {
        return;
      }

      setGmailStatus(body.data.gmail);
    }

    loadStatus().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [sessionUser.mode]);

  async function parsePastedContext(rawText: string, merchantUrlHint: string) {
    const response = await fetch("/api/v1/intake/parse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        rawText,
        merchantUrlHint
      })
    });

    const body = (await response.json()) as { data?: ParseIntakeResponseData; error?: { message?: string } };
    if (!response.ok || !body.data) {
      throw new Error(body.error?.message ?? "Failed to parse the pasted context.");
    }

    return body.data.suggestion;
  }

  async function parseUploadedProof(nextFile: File, merchantUrlHint: string) {
    const formData = new FormData();
    formData.append("merchantUrlHint", merchantUrlHint);
    formData.append("file", nextFile);

    const response = await fetch("/api/v1/intake/parse-upload", {
      method: "POST",
      body: formData
    });

    const body = (await response.json()) as {
      data?: ParseIntakeUploadResponseData;
      error?: { message?: string };
    };

    if (!response.ok || !body.data) {
      throw new Error(body.error?.message ?? "Failed to read the uploaded proof.");
    }

    return body.data;
  }

  async function searchGmailResults(query: string) {
    if (!query.trim()) {
      throw new Error("Enter a merchant or order clue before searching Gmail.");
    }

    setError(null);
    setIsSearchingGmail(true);

    try {
      const response = await fetch("/api/v1/integrations/gmail/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query
        })
      });

      const body = (await response.json()) as { data?: GmailSearchResponseData; error?: { message?: string } };
      if (!response.ok || !body.data) {
        throw new Error(body.error?.message ?? "Failed to search Gmail.");
      }

      setGmailQuery(query);
      setGmailResults(body.data.messages);
      return body.data.messages;
    } finally {
      setIsSearchingGmail(false);
    }
  }

  function applyGmailResult(result: GmailSearchResult) {
    setAutopilotContext(result.rawText);
    setSuggestion(result.suggestion);
    setForm((current) => applySuggestionToForm(current, result.suggestion));
    setFile(null);
    setIntakeSource("gmail");
  }

  async function useGmailMessageById(messageId: string) {
    const result = gmailResults.find((candidate) => candidate.messageId === messageId);
    if (!result) {
      throw new Error("That Gmail result is no longer available. Search again.");
    }

    applyGmailResult(result);
  }

  async function captureVoiceProblem(rawText: string) {
    const trimmed = rawText.trim();
    if (!trimmed) {
      throw new Error("Tell Refund Raider what happened first.");
    }

    setError(null);
    setSubmitStage("autofilling");

    try {
      const nextSuggestion = await parsePastedContext(trimmed, form.merchantUrl);
      setAutopilotContext(trimmed);
      setSuggestion(nextSuggestion);
      setForm((current) => applySuggestionToForm(current, nextSuggestion));
      setFile(null);
      setIntakeSource("voice");
      return nextSuggestion;
    } finally {
      setSubmitStage("idle");
    }
  }

  async function runAutofill() {
    if (!autopilotContext.trim() && !form.merchantUrl.trim() && !file) {
      throw new Error("Paste an order/support message, add a merchant URL, or upload proof first.");
    }

    setError(null);
    setIsAutofillRunning(true);
    setSubmitStage("autofilling");

    try {
      if (autopilotContext.trim() || form.merchantUrl.trim()) {
        const nextSuggestion = await parsePastedContext(autopilotContext, form.merchantUrl);
        setSuggestion(nextSuggestion);
        setForm((current) => applySuggestionToForm(current, nextSuggestion));
        return nextSuggestion;
      }

      const nextData = await parseUploadedProof(file!, form.merchantUrl);
      const nextSuggestion = nextData.suggestion;
      setAutopilotContext((current) => current || nextData.extractedText);
      setSuggestion(nextSuggestion);
      setForm((current) => applySuggestionToForm(current, nextSuggestion));
      setIntakeSource("upload");
      return nextSuggestion;
    } finally {
      setIsAutofillRunning(false);
      setSubmitStage("idle");
    }
  }

  async function createCaseFromCurrentIntake() {
    let nextSuggestion = suggestion;

    if (!nextSuggestion && hasAutopilotContext) {
      nextSuggestion = await runAutofill();
    }

    const nextForm = nextSuggestion ? applySuggestionToForm(form, nextSuggestion) : form;
    if (!nextForm.merchantName.trim() || !nextForm.issueSummary.trim()) {
      throw new Error(
        "Refund Raider still needs a merchant name and issue summary. Edit the review fields and try again."
      );
    }

    setForm(nextForm);

    const result = await runCaseCreationWorkflow({
      form: nextForm,
      suggestion: nextSuggestion,
      autopilotContext,
      file,
      intakeSource,
      setStage: setSubmitStage
    });

    const targetPath = buildCaseWorkspacePath(result.caseId);
    setSubmitStage("opening_workspace");
    persistCaseHandoff({
      caseId: result.caseId,
      source: intakeSource,
      merchantName: nextForm.merchantName,
      createdAt: new Date().toISOString()
    });

    router.push(targetPath);
    router.refresh();

    if (typeof window !== "undefined") {
      const startedAt = Date.now();
      while (Date.now() - startedAt < 1_500) {
        if (window.location.pathname === targetPath) {
          return result;
        }

        await new Promise((resolve) => window.setTimeout(resolve, 100));
      }

      window.location.assign(targetPath);
    }

    return result;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValid) {
      setError("Paste your order/support context or fill the review fields first.");
      return;
    }

    setError(null);
    try {
      await createCaseFromCurrentIntake();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unexpected intake error.");
      setSubmitStage("idle");
    }
  }

  async function handleAppSignIn() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/cases/new/integrations`
      }
    });
  }

  async function handleAppSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/cases/new/integrations";
  }

  function handleConnectGmail() {
    window.location.href = "/api/v1/integrations/gmail/connect?redirectTo=/cases/new/integrations";
  }

  async function handleDisconnectGmail() {
    const response = await fetch("/api/v1/integrations/gmail/disconnect", {
      method: "POST"
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error?.message ?? "Failed to disconnect Gmail.");
    }

    setGmailStatus((current) =>
      current
        ? {
            ...current,
            connected: false,
            email: null
          }
        : null
    );
    setGmailResults([]);
  }

  async function handleSearchGmail() {
    try {
      await searchGmailResults(gmailQuery);
    } catch (gmailError) {
      setError(gmailError instanceof Error ? gmailError.message : "Failed to search Gmail.");
    }
  }

  const value = useMemo<IntakeWorkspaceContextValue>(
    () => ({
      sessionUser,
      authAvailable,
      gmailAvailable,
      form,
      setForm,
      autopilotContext,
      setAutopilotContext,
      file,
      setFile,
      error,
      setError,
      submitStage,
      isAutofillRunning,
      suggestion,
      setSuggestion,
      gmailStatus,
      gmailQuery,
      setGmailQuery,
      gmailResults,
      isSearchingGmail,
      intakeSource,
      setIntakeSource,
      gmailFlash,
      authFlash,
      hasAutopilotContext,
      isValid,
      captureVoiceProblem,
      createCaseFromCurrentIntake,
      runAutofill,
      searchGmailResults,
      useGmailMessageById,
      handleSubmit,
      handleAppSignIn,
      handleAppSignOut,
      handleConnectGmail,
      handleDisconnectGmail,
      handleSearchGmail
    }),
    [
      authAvailable,
      authFlash,
      autopilotContext,
      error,
      file,
      form,
      gmailAvailable,
      gmailFlash,
      gmailQuery,
      gmailResults,
      gmailStatus,
      hasAutopilotContext,
      intakeSource,
      isAutofillRunning,
      isSearchingGmail,
      isValid,
      sessionUser,
      submitStage,
      suggestion
    ]
  );

  return <IntakeWorkspaceContext.Provider value={value}>{children}</IntakeWorkspaceContext.Provider>;
}

export function useIntakeWorkspace() {
  const context = useContext(IntakeWorkspaceContext);
  if (!context) {
    throw new Error("useIntakeWorkspace must be used within IntakeWorkspaceProvider");
  }

  return context;
}
