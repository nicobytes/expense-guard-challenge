// Dataset-driven decision evals: one case per fixture from evals/data/cases.yaml.
// Each case loads its fixture explicitly and passes it via clientContext (no POC_REQUEST_FILE).
import { defineEval } from "eve/evals";
import { matches } from "eve/evals/expect";
import { loadYaml } from "eve/evals/loaders";
import { ExpenseDecisionSchema } from "../agent/lib/expense.schema.js";
import { type EvalCase, loadCaseSubmission } from "./shared.js";

const doc = (await loadYaml("evals/data/cases.yaml")) as { evals: EvalCase[] };
const rows = doc.evals;

export default rows.map((row) =>
  defineEval({
    description: row.description,
    tags: ["expense-guard", "decision", row.id],
    async test(t) {
      const submission = loadCaseSubmission(row.fixture);
      const Expected = ExpenseDecisionSchema.refine(
        (d) => d.decision === row.expect_decision,
        `expected ${row.expect_decision}`
      );

      const turn = await t.send({
        clientContext: { expense_submission: submission },
        message: "Review the expense submission and return your decision.",
        outputSchema: ExpenseDecisionSchema,
      });

      t.didNotFail();
      t.calledTool("search_policy").gate();
      t.check(turn.data, matches(Expected)).gate();
    },
  })
);
