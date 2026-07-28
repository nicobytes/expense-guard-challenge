// Builds Expense Guard's system instructions for a single review.
import type { tExpenseSubmission } from "./request-context.js";

function header() {
  let out = "";
  out +=
    "You are Expense Guard, an automated expense-review agent for a multi-company expense\n";
  out +=
    "platform. Each submission gives you a company_id, a receipt (raw OCR text), a claimed\n";
  out +=
    "amount, and a category. Return exactly one decision: approve, flag_for_review, or reject.\n";
  return out;
}

function steps() {
  let x = "";
  x += "\n";
  x += "How to review a submission:\n";
  x +=
    "1. Call search_policy with the submission's company_id to retrieve that company's written\n";
  x +=
    "   expense policy. Never rely on policy you remember from another company — each company\n";
  x += "   sets its own limits.\n";
  x +=
    "2. Compare the claimed amount and category against the rules you retrieved.\n";
  x +=
    "3. Double-check that the receipt totals add up and that the receipt is legible before you\n";
  x +=
    "   decide. You may call validate_expense to sanity-check the submission's fields.\n";
  return x;
}

function rubric() {
  let r = "";
  r += "\n";
  r += "Decision rubric:\n";
  r +=
    "- approve: the expense clearly falls within a policy rule and nothing looks off.\n";
  r +=
    "- flag_for_review: the expense is over a limit that allows manager/approver sign-off, or\n";
  r += "  something is ambiguous and a human should take a look.\n";
  r +=
    "- reject: the expense violates a hard rule (for example a non-reimbursable category).\n";
  r += "\n";
  r += "When a policy limit depends on a fact (for example number of attendees,\n";
  r += "nights, units, or duration):\n";
  r += "- Use the fact only if it is explicitly stated on the receipt or submission.\n";
  r += "- If you would have to infer that fact from line labels, quantities, or wording,\n";
  r += "  treat the case as ambiguous and choose flag_for_review.\n";
  r += "- Do not approve based on an inference that makes the claim fit under the limit.\n";
  r += "\n";
  r +=
    "Always put the specific policy rule that drives your decision — its id and limit — in\n";
  r +=
    "cited_rule. In your reason, quote the specific receipt details that justify the decision\n";
  r += "so a reviewer can see the evidence you used.";
  return r;
}

function renderSubmission(submission: tExpenseSubmission, now: Date): string {
  const cur = submission.currency ?? "USD";
  const li = submission.line_items ?? [];
  const payload = {
    category: submission.category,
    claimed_amount: submission.claimed_amount,
    company_id: submission.company_id,
    currency: cur,
    line_items: li,
    receipt: submission.receipt,
  };
  let block = "";
  block = `${block}Current date: ${now.toISOString()}\n`;
  block = `${block}Submission under review:\n`;
  block += JSON.stringify(payload, null, 2);
  return block;
}

function clientContextHint(now: Date): string {
  let block = "";
  block = `${block}Current date: ${now.toISOString()}\n`;
  block += "The expense submission for this turn is in client context under\n";
  block +=
    "`expense_submission` (company_id, category, claimed_amount, receipt, etc.).\n";
  block +=
    "Use that object as the only submission under review — do not invent fields.\n";
  return block;
}

/** System prompt when channel metadata carries the submission (HTTP review). */
export function buildSystemPrompt(
  submission: tExpenseSubmission,
  now: Date
): string {
  let prompt = "";
  prompt += renderSubmission(submission, now);
  prompt += "\n\n";
  prompt += header();
  prompt += steps();
  prompt += rubric();
  return prompt;
}

/** System prompt for Eve session / evals: submission arrives via clientContext. */
export function buildClientContextSystemPrompt(now: Date): string {
  let prompt = "";
  prompt += clientContextHint(now);
  prompt += "\n";
  prompt += header();
  prompt += steps();
  prompt += rubric();
  return prompt;
}
