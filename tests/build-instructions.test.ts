import { describe, expect, it } from "vitest";
import {
  buildClientContextSystemPrompt,
  buildSystemPrompt,
} from "../agent/lib/build-instructions.js";
import type { tExpenseSubmission } from "../agent/lib/expense.schema.js";

const FIXED_NOW = new Date("2026-01-15T12:00:00.000Z");

const submission: tExpenseSubmission = {
  category: "meals",
  claimed_amount: 42,
  company_id: "acme",
  currency: "USD",
  line_items: [{ amount: 42, label: "Lunch" }],
  receipt: "Lunch at Cafe",
};

describe("buildSystemPrompt", () => {
  it("puts submission before role and includes rubric", () => {
    const prompt = buildSystemPrompt(submission, FIXED_NOW);

    expect(prompt).toContain("Current date: 2026-01-15T12:00:00.000Z");
    expect(prompt).toContain('"company_id": "acme"');
    expect(prompt).toContain('"claimed_amount": 42');

    expect(prompt).toContain("You are Expense Guard");
    expect(prompt).toContain("How to review a submission:");
    expect(prompt).toContain("Decision rubric:");
    expect(prompt).toContain("infer that fact");
    expect(prompt).toContain("flag_for_review");

    const dateAt = prompt.indexOf("Current date:");
    const roleAt = prompt.indexOf("You are Expense Guard");
    expect(dateAt).toBeGreaterThanOrEqual(0);
    expect(roleAt).toBeGreaterThan(dateAt);
  });
});

describe("buildClientContextSystemPrompt", () => {
  it("points at expense_submission without embedding a receipt", () => {
    const prompt = buildClientContextSystemPrompt(FIXED_NOW);
    expect(prompt).toContain("expense_submission");
    expect(prompt).toContain("You are Expense Guard");
    expect(prompt).not.toContain("Lunch at Cafe");
  });
});
