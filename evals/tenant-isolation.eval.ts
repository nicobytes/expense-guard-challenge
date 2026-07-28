// Confirms module-level policy memoization leaks across companies.
// Sequence: review Acme software (caches Acme), then Globex software in a new
// session. Globex SW-01 always requires VP approval (flag). If activePolicy is
// stuck on Acme, Globex gets Acme's "$200 auto-approve" rule and may approve —
// this eval expects flag_for_review and should FAIL until the memo is fixed.
import { defineEval } from "eve/evals";
import { matches } from "eve/evals/expect";
import { ExpenseDecisionSchema, type tExpenseSubmission } from "../agent/lib/expense.schema.js";

const acmeSoftware: tExpenseSubmission = {
  company_id: "acme",
  category: "software",
  claimed_amount: 100,
  currency: "USD",
  receipt: "ACME TOOLS SAAS\nPlan: Starter (monthly)\nTOTAL .... $100.00",
  line_items: [{ label: "Starter plan", amount: 100 }],
};

const globexSoftware: tExpenseSubmission = {
  company_id: "globex",
  category: "software",
  claimed_amount: 100,
  currency: "USD",
  receipt: "GLOBEX APPS SAAS\nPlan: Starter (monthly)\nTOTAL .... $100.00",
  line_items: [{ label: "Starter plan", amount: 100 }],
};

const Flagged = ExpenseDecisionSchema.refine(
  (d) => d.decision === "flag_for_review",
  "expected flag_for_review under Globex SW-01 (software always needs VP approval)",
);

export default defineEval({
  description:
    "After an Acme software review, a Globex software review must use Globex policy (flag), not memoized Acme policy",
  tags: ["expense-guard", "tenant-isolation", "known-bug"],
  async test(t) {
    // Prime the process-wide activePolicy cache with Acme.
    const acmeTurn = await t.send({
      message: "Review the expense submission and return your decision.",
      clientContext: { expense_submission: acmeSoftware },
      outputSchema: ExpenseDecisionSchema,
    });
    t.didNotFail();
    t.calledTool("search_policy");

    // Fresh session, same agent process — module memo should still be poisoned.
    const globex = t.newSession();
    const globexTurn = await globex.send({
      message: "Review the expense submission and return your decision.",
      clientContext: { expense_submission: globexSoftware },
      outputSchema: ExpenseDecisionSchema,
    });
    globexTurn.expectOk();

    t.check(globexTurn.data, matches(Flagged)).gate();
  },
});
