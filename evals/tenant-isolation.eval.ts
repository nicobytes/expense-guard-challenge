// Regression guard: successive reviews for different companies must not share
// policy. Sequence: Acme software, then Globex software in a new session.
// Globex SW-01 always requires VP approval → flag_for_review. If a process-wide
// policy memo were reintroduced and stuck on Acme, Globex could wrongly approve.
import { defineEval } from "eve/evals";
import { matches } from "eve/evals/expect";
import {
  ExpenseDecisionSchema,
  type tExpenseSubmission,
} from "../agent/lib/expense.schema.js";

const acmeSoftware: tExpenseSubmission = {
  category: "software",
  claimed_amount: 100,
  company_id: "acme",
  currency: "USD",
  line_items: [{ amount: 100, label: "Starter plan" }],
  receipt: "ACME TOOLS SAAS\nPlan: Starter (monthly)\nTOTAL .... $100.00",
};

const globexSoftware: tExpenseSubmission = {
  category: "software",
  claimed_amount: 100,
  company_id: "globex",
  currency: "USD",
  line_items: [{ amount: 100, label: "Starter plan" }],
  receipt: "GLOBEX APPS SAAS\nPlan: Starter (monthly)\nTOTAL .... $100.00",
};

const Flagged = ExpenseDecisionSchema.refine(
  (d) => d.decision === "flag_for_review",
  "expected flag_for_review under Globex SW-01 (software always needs VP approval)"
);

export default defineEval({
  description:
    "After an Acme software review, a Globex software review must use Globex policy (flag), not a prior company's policy",
  tags: ["expense-guard", "tenant-isolation"],
  async test(t) {
    // First company in this process — must not leak into the next session.
    const _acmeTurn = await t.send({
      clientContext: { expense_submission: acmeSoftware },
      message: "Review the expense submission and return your decision.",
      outputSchema: ExpenseDecisionSchema,
    });
    t.didNotFail();
    t.calledTool("search_policy");

    // Fresh session, same agent process — must still resolve Globex policy.
    const globex = t.newSession();
    const globexTurn = await globex.send({
      clientContext: { expense_submission: globexSoftware },
      message: "Review the expense submission and return your decision.",
      outputSchema: ExpenseDecisionSchema,
    });
    globexTurn.expectOk();

    t.check(globexTurn.data, matches(Flagged)).gate();
  },
});
