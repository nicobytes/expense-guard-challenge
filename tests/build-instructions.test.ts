import { describe, expect, it } from "vitest";
import {
  buildReviewUserMessage,
  buildSystemPrompt,
  reviewInstructions,
} from "../agent/lib/build-instructions.js";
import type { tExpenseSubmission } from "../agent/lib/expense.schema.js";

const FIXED_NOW = new Date("2026-01-15T12:00:00.000Z");
const ISO_DATE_PREFIX = /\d{4}-\d{2}-\d{2}T/;

const submission: tExpenseSubmission = {
  category: "meals",
  claimed_amount: 42,
  company_id: "acme",
  currency: "USD",
  line_items: [{ amount: 42, label: "Lunch" }],
  receipt: "Lunch at Cafe",
};

describe("buildSystemPrompt", () => {
  it("is static role/rubric plus clientContext hint with no per-request payload", () => {
    const prompt = buildSystemPrompt();

    expect(prompt).toContain("You are Expense Guard");
    expect(prompt).toContain("How to review a submission:");
    expect(prompt).toContain("Decision rubric:");
    expect(prompt).toContain("infer that fact");
    expect(prompt).toContain("flag_for_review");
    expect(prompt).toContain("expense_submission");

    expect(prompt).not.toContain("Current date:");
    expect(prompt).not.toContain("Lunch at Cafe");
    expect(prompt).not.toContain('"company_id": "acme"');
    expect(prompt).not.toContain('"claimed_amount": 42');
  });
});

describe("reviewInstructions", () => {
  it("has no dates or submission fields", () => {
    const text = reviewInstructions();
    expect(text).toContain("You are Expense Guard");
    expect(text).not.toMatch(ISO_DATE_PREFIX);
    expect(text).not.toContain("expense_submission");
  });
});

describe("buildReviewUserMessage", () => {
  it("embeds date, submission JSON, and CTA", () => {
    const message = buildReviewUserMessage(submission, FIXED_NOW);

    expect(message).toContain("Current date: 2026-01-15T12:00:00.000Z");
    expect(message).toContain('"company_id": "acme"');
    expect(message).toContain('"claimed_amount": 42');
    expect(message).toContain("Lunch at Cafe");
    expect(message).toContain(
      "Review this expense submission and return your decision."
    );
    expect(message).not.toContain("You are Expense Guard");
  });
});
