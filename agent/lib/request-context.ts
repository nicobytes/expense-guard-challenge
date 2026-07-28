// Per-request context for a review: the expense submission plus trace-identity fields.
// HTTP review maps a validated body onto channel state -> metadata. Evals pass the
// submission explicitly via clientContext (no silent fixture default).
import { readFileSync } from "node:fs";
import { defineState } from "eve/context";
import type { tExpenseSubmission } from "./expense.schema.js";
import { ExpenseSubmissionSchema } from "./expense.schema.js";

export type {
  tExpenseLineItem,
  tExpenseSubmission,
} from "./expense.schema.js";

// The per-session projection carried by channel state -> metadata(state). `contextProvided`
// means a validated submission reached the channel; without it, resolve throws.
export interface tRequestView {
  contextProvided: boolean;
  request: tExpenseSubmission | null;
}

/** Load and Zod-parse a fixture from an explicit path (relative to cwd or absolute). */
export function loadExpenseFixture(path: string): tExpenseSubmission {
  const raw: unknown = JSON.parse(readFileSync(path, "utf8"));
  return ExpenseSubmissionSchema.parse(raw);
}

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function isNonEmptyObject(v: unknown): v is Record<string, unknown> {
  return isPlainObject(v) && Object.keys(v).length > 0;
}

// WRITE side — review channel builds state from a validated body.
export function buildRequestView(submission: tExpenseSubmission): tRequestView {
  return { contextProvided: true, request: submission };
}

// READ side — require channel metadata. No POC_REQUEST_FILE / fixture fallback.
export function resolveExpenseSubmission(
  view: { request?: unknown; contextProvided?: unknown } | undefined
): tExpenseSubmission {
  if (view?.contextProvided === true) {
    if (isPlainObject(view.request)) {
      return ExpenseSubmissionSchema.parse(view.request);
    }
    throw new Error(
      "Per-request expense context was provided but did not reach the resolver via channel " +
        "metadata/state."
    );
  }
  throw new Error(
    "No expense submission in channel metadata. " +
      "HTTP review must send a validated body; evals must pass clientContext.expense_submission."
  );
}

/** True when channel metadata carries a submission (review HTTP path). */
export function hasChannelSubmission(
  view: { request?: unknown; contextProvided?: unknown } | undefined
): boolean {
  return view?.contextProvided === true && isPlainObject(view.request);
}

// The authoritative submission for this turn when provided via channel metadata.
export const submissionState = defineState<tExpenseSubmission | null>(
  "expense-guard.submission",
  () => null
);

export function setSubmissionState(
  submission: tExpenseSubmission | null
): void {
  submissionState.update(() => submission);
}
