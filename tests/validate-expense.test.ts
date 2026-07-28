import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { tExpenseSubmission } from "../agent/lib/expense.schema.js";
import { validateExpense } from "../agent/tools/validate_expense.js";

const AMOUNT_MISMATCH_RE = /line_items|claimed_amount|sum|total/i;

function loadFixture(name: string): tExpenseSubmission {
  return JSON.parse(
    readFileSync(join(process.cwd(), "fixtures", name), "utf8")
  );
}

describe("validateExpense — claimed_amount vs line_items", () => {
  it("accepts a fixture where line_items sum to claimed_amount (valid.json)", () => {
    const fixture = loadFixture("valid.json");
    const lineSum = fixture.line_items?.reduce((s, i) => s + i.amount, 0);
    expect(lineSum).toBe(fixture.claimed_amount);

    const result = validateExpense({
      category: fixture.category,
      claimed_amount: fixture.claimed_amount,
      company_id: fixture.company_id,
      line_items: fixture.line_items,
    });

    expect(result.valid).toBe(true);
  });

  it("rejects when claimed_amount does not match the sum of line_items (illegible.json)", () => {
    const fixture = loadFixture("illegible.json");
    const lineSum = fixture.line_items?.reduce((s, i) => s + i.amount, 0);
    // claimed 1280 vs baggage-only line item 45 — totals do not add up
    expect(lineSum).not.toBe(fixture.claimed_amount);

    const result = validateExpense({
      category: fixture.category,
      claimed_amount: fixture.claimed_amount,
      company_id: fixture.company_id,
      line_items: fixture.line_items,
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.stringMatching(AMOUNT_MISMATCH_RE)])
    );
  });

  it("rejects an explicit mismatch even when core fields are present", () => {
    const result = validateExpense({
      category: "meals",
      claimed_amount: 100,
      company_id: "acme",
      line_items: [
        { amount: 40, label: "Entree" },
        { amount: 10, label: "Drink" },
      ],
    });

    expect(result.valid).toBe(false);
  });

  it("accepts claimed_amount 0 when line_items are missing or empty", () => {
    expect(
      validateExpense({
        category: "meals",
        claimed_amount: 0,
        company_id: "acme",
      }).valid
    ).toBe(true);
    expect(
      validateExpense({
        category: "meals",
        claimed_amount: 0,
        company_id: "acme",
        line_items: [],
      }).valid
    ).toBe(true);
  });

  it("rejects claimed_amount > 0 when line_items are missing or empty", () => {
    expect(
      validateExpense({
        category: "meals",
        claimed_amount: 100,
        company_id: "acme",
      }).valid
    ).toBe(false);
    expect(
      validateExpense({
        category: "meals",
        claimed_amount: 100,
        company_id: "acme",
        line_items: [],
      }).valid
    ).toBe(false);
  });
});
