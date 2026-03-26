import { NextResponse } from "next/server";

export interface ApiMeta {
  requestId: string;
}

export interface ApiSuccessEnvelope<T> {
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: ApiMeta;
}

function createRequestId() {
  return crypto.randomUUID();
}

export function ok<T>(data: T, status: number = 200) {
  return NextResponse.json<ApiSuccessEnvelope<T>>(
    {
      data,
      meta: { requestId: createRequestId() }
    },
    { status }
  );
}

export function apiError(status: number, code: string, message: string, details?: unknown) {
  const body: ApiErrorEnvelope = {
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {})
    },
    meta: { requestId: createRequestId() }
  };

  return NextResponse.json(body, { status });
}
