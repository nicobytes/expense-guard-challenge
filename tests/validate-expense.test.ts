import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validateExpense } from "../agent/tools/validate_expense.js";
import type { tExpenseSubmission } from "../agent/lib/expense.schema.js";

function loadFixture(name: string): tExpenseSubmission {
  return JSON.parse(readFileSync(join(process.cwd(), "fixtures", name), "utf8"));
}

describe("validateExpense — claimed_amount vs line_items", () => {
  it("accepts a fixture where line_items sum to claimed_amount (valid.json)", () => {
    const fixture = loadFixture("valid.json");
    const lineSum = fixture.line_items!.reduce((s, i) => s + i.amount, 0);
    expect(lineSum).toBe(fixture.claimed_amount);

    const result = validateExpense({
      company_id: fixture.company_id,
      category: fixture.category,
      claimed_amount: fixture.claimed_amount,
      line_items: fixture.line_items,
    });

    expect(result.valid).toBe(true);
  });

  it("rejects when claimed_amount does not match the sum of line_items (illegible.json)", () => {
    const fixture = loadFixture("illegible.json");
    const lineSum = fixture.line_items!.reduce((s, i) => s + i.amount, 0);
    // claimed 1280 vs baggage-only line item 45 — totals do not add up
    expect(lineSum).not.toBe(fixture.claimed_amount);

    const result = validateExpense({
      company_id: fixture.company_id,
      category: fixture.category,
      claimed_amount: fixture.claimed_amount,
      line_items: fixture.line_items,
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.stringMatching(/line_items|claimed_amount|sum|total/i)]),
    );
  });

  it("rejects an explicit mismatch even when core fields are present", () => {
    const result = validateExpense({
      company_id: "acme",
      category: "meals",
      claimed_amount: 100,
      line_items: [
        { label: "Entree", amount: 40 },
        { label: "Drink", amount: 10 },
      ],
    });

    expect(result.valid).toBe(false);
  });

  it("accepts claimed_amount 0 when line_items are missing or empty", () => {
    expect(
      validateExpense({ company_id: "acme", category: "meals", claimed_amount: 0 }).valid,
    ).toBe(true);
    expect(
      validateExpense({
        company_id: "acme",
        category: "meals",
        claimed_amount: 0,
        line_items: [],
      }).valid,
    ).toBe(true);
  });

  it("rejects claimed_amount > 0 when line_items are missing or empty", () => {
    expect(
      validateExpense({ company_id: "acme", category: "meals", claimed_amount: 100 }).valid,
    ).toBe(false);
    expect(
      validateExpense({
        company_id: "acme",
        category: "meals",
        claimed_amount: 100,
        line_items: [],
      }).valid,
    ).toBe(false);
  });
});
