// Builds Expense Guard prompts: static system instructions + per-request user message.
import { stripIndent } from "common-tags";
import type { tExpenseSubmission } from "./expense.schema.js";

function header() {
  return stripIndent`
    You are Expense Guard, an automated expense-review agent for a multi-company expense
    platform. Each submission gives you a company_id, a receipt (raw OCR text), a claimed
    amount, and a category. Return exactly one decision: approve, flag_for_review, or reject.
  `;
}

function steps() {
  return stripIndent`

    How to review a submission:
    1. Call search_policy with the submission's company_id to retrieve that company's written
       expense policy. Never rely on policy you remember from another company — each company
       sets its own limits.
    2. Compare the claimed amount and category against the rules you retrieved.
    3. Double-check that the receipt totals add up and that the receipt is legible before you
       decide. You may call validate_expense to sanity-check the submission's fields.
  `;
}

function rubric() {
  return stripIndent`

    Decision rubric:
    - approve: the expense clearly falls within a policy rule and nothing looks off.
    - flag_for_review: the expense is over a limit that allows manager/approver sign-off, or
      something is ambiguous and a human should take a look.
    - reject: the expense violates a hard rule (for example a non-reimbursable category).

    When a policy limit depends on a fact (for example number of attendees,
    nights, units, or duration):
    - Use the fact only if it is explicitly stated on the receipt or submission.
    - If you would have to infer that fact from line labels, quantities, or wording,
      treat the case as ambiguous and choose flag_for_review.
    - Do not approve based on an inference that makes the claim fit under the limit.

    Always put the specific policy rule that drives your decision — its id and limit — in
    cited_rule. In your reason, quote the specific receipt details that justify the decision
    so a reviewer can see the evidence you used.
  `;
}

/** Role, steps, and rubric — identical across every review (cache-friendly system prefix). */
export function reviewInstructions(): string {
  return stripIndent`
    ${header()}
    ${steps()}
    ${rubric()}
  `;
}

/**
 * Static eval/session hint — no Date, no per-request fields.
 * HTTP review embeds the submission in the user message instead.
 */
export function clientContextHint(): string {
  return stripIndent`
    When the user message does not embed a submission, use client context
    \`expense_submission\` (company_id, category, claimed_amount, receipt, etc.)
    as the only submission under review — do not invent fields.
  `;
}

/** Full static system prompt (build-time / every turn, never per-submission). */
export function buildSystemPrompt(): string {
  return stripIndent`
    ${reviewInstructions()}

    ${clientContextHint()}
  `.trim();
}

/** Per-request user turn for HTTP review — date + submission live here, not in system. */
export function buildReviewUserMessage(
  submission: tExpenseSubmission,
  now: Date
): string {
  const payload = {
    category: submission.category,
    claimed_amount: submission.claimed_amount,
    company_id: submission.company_id,
    currency: submission.currency ?? "USD",
    line_items: submission.line_items ?? [],
    receipt: submission.receipt,
  };

  return stripIndent`
    Current date: ${now.toISOString()}
    Submission under review:
    ${JSON.stringify(payload, null, 2)}

    Review this expense submission and return your decision.
  `.trim();
}
