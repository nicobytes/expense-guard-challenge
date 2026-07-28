import { loadExpenseFixture, type tExpenseSubmission } from "../agent/lib/request-context.js";
import { DECISIONS } from "../agent/lib/expense.schema.js";

export type tExpectDecision = (typeof DECISIONS)[number];

export type EvalCase = {
  id: string;
  fixture: string;
  description: string;
  expect_decision: tExpectDecision;
};

export function loadCaseSubmission(fixturePath: string): tExpenseSubmission {
  return loadExpenseFixture(fixturePath);
}
