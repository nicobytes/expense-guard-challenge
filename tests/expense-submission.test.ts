import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ExpenseSubmissionSchema } from "../agent/lib/expense.schema.js";

describe("ExpenseSubmissionSchema", () => {
  it("accepts a valid fixture submission", () => {
    const fixture = JSON.parse(
      readFileSync(join(process.cwd(), "fixtures", "valid.json"), "utf8")
    );
    const parsed = ExpenseSubmissionSchema.safeParse(fixture);
    expect(parsed.success).toBe(true);
  });

  it("rejects an incomplete submission", () => {
    const parsed = ExpenseSubmissionSchema.safeParse({
      company_id: "acme",
      label: "production",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const paths = parsed.error.issues.map((i) => i.path.join("."));
      expect(paths).toEqual(
        expect.arrayContaining(["category", "claimed_amount", "receipt"])
      );
    }
  });
});
