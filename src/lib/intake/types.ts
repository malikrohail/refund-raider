export type IntakeFormState = {
  merchantName: string;
  merchantUrl: string;
  issueSummary: string;
  issueType:
    | "damaged_item"
    | "missing_item"
    | "wrong_item"
    | "late_delivery"
    | "service_not_rendered"
    | "subscription_cancellation"
    | "other";
  desiredOutcome: "full_refund" | "partial_refund" | "replacement" | "refund_or_replacement";
  purchaseDate: string;
  paymentMethod: "credit_card" | "debit_card" | "paypal" | "apple_pay" | "shop_pay" | "other" | "unknown";
  merchantContactEmail: string;
};

export type IntakeSubmitStage =
  | "idle"
  | "autofilling"
  | "creating"
  | "saving_context"
  | "saving_proof"
  | "researching"
  | "drafting"
  | "opening_workspace";

export type IntakeSource = "paste" | "upload" | "gmail" | "voice";

export type BrowserUploadFile = {
  name: string;
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export const initialIntakeFormState: IntakeFormState = {
  merchantName: "",
  merchantUrl: "",
  issueSummary: "",
  issueType: "damaged_item",
  desiredOutcome: "full_refund",
  paymentMethod: "unknown",
  purchaseDate: "",
  merchantContactEmail: ""
};
