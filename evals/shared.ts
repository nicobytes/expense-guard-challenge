import type { DECISIONS } from "../agent/lib/expense.schema.js";
import {
  loadExpenseFixture,
  type tExpenseSubmission,
} from "../agent/lib/request-context.js";

export type tExpectDecision = (typeof DECISIONS)[number];

export interface EvalCase {
  description: string;
  expect_decision: tExpectDecision;
  fixture: string;
  id: string;
}

export function loadCaseSubmission(fixturePath: string): tExpenseSubmission {
  return loadExpenseFixture(fixturePath);
}
