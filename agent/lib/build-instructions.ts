// Builds Expense Guard's system instructions for a single review.
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

function reviewInstructions(): string {
  return stripIndent`
    ${header()}
    ${steps()}
    ${rubric()}
  `;
}

function renderSubmission(submission: tExpenseSubmission, now: Date): string {
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
  `;
}

function clientContextHint(now: Date): string {
  return stripIndent`
    Current date: ${now.toISOString()}
    The expense submission for this turn is in client context under
    \`expense_submission\` (company_id, category, claimed_amount, receipt, etc.).
    Use that object as the only submission under review — do not invent fields.
  `;
}

/** System prompt when channel metadata carries the submission (HTTP review). */
export function buildSystemPrompt(
  submission: tExpenseSubmission,
  now: Date
): string {
  return stripIndent`
    ${renderSubmission(submission, now)}

    ${reviewInstructions()}
  `.trim();
}

/** System prompt for Eve session / evals: submission arrives via clientContext. */
export function buildClientContextSystemPrompt(now: Date): string {
  return stripIndent`
    ${clientContextHint(now)}

    ${reviewInstructions()}
  `.trim();
}
