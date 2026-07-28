// Sanity-checks an expense submission before the model decides.
// claimed_amount must equal sum(line_items); missing/empty line_items ⇒ sum 0.
import { stripIndent } from "common-tags";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { ExpenseLineItemSchema } from "../lib/expense.schema.js";

/** Shared field schema for the tool input and pure validator. */
const ValidateExpenseInputSchema = z.object({
  category: z.string().min(1).describe("The submission's category."),
  claimed_amount: z.number().describe("The total amount claimed."),
  company_id: z.string().min(1).describe("The submission's company_id."),
  line_items: z
    .array(ExpenseLineItemSchema)
    .optional()
    .describe("Optional line items; their amounts must sum to claimed_amount."),
});

/** Same fields + claimed_amount vs line_items sum (used by validateExpense). */
const ValidateExpenseWithSumSchema = ValidateExpenseInputSchema.superRefine(
  (data, ctx) => {
    const items = data.line_items ?? [];
    const sum = items.reduce((s, i) => s + i.amount, 0);
    if (sum !== data.claimed_amount) {
      ctx.addIssue({
        code: "custom",
        message: `claimed_amount (${data.claimed_amount}) does not match line_items sum (${sum})`,
        path: ["claimed_amount"],
      });
    }
  }
);

export type tValidateExpenseInput = z.infer<typeof ValidateExpenseInputSchema>;

export interface tValidateExpenseResult {
  issues: string[];
  missing_fields: string[];
  valid: boolean;
}

/** Pure validation used by the tool (exported for unit tests). */
export function validateExpense(
  input: tValidateExpenseInput
): tValidateExpenseResult {
  const parsed = ValidateExpenseWithSumSchema.safeParse(input);
  if (parsed.success) {
    return { issues: [], missing_fields: [], valid: true };
  }

  const missing_fields: string[] = [];
  const issues: string[] = [];
  for (const issue of parsed.error.issues) {
    const path = issue.path.join(".") || "(root)";
    const msg = `${path}: ${issue.message}`;
    issues.push(msg);
    if (issue.code === "too_small" || issue.code === "invalid_type") {
      const key = String(issue.path[0] ?? "");
      if (key && !missing_fields.includes(key)) {
        missing_fields.push(key);
      }
    }
  }
  return { issues, missing_fields, valid: false };
}

export default defineTool({
  description: stripIndent`
    Sanity-check an expense submission before deciding. Confirms core fields and that
    claimed_amount equals the sum of line_items (0 when line_items are missing or empty).
  `,
  execute({ company_id, category, claimed_amount, line_items }) {
    return validateExpense({
      category,
      claimed_amount,
      company_id,
      line_items,
    });
  },
  // Field schema only — sum check runs in validateExpense so the model gets
  // { valid: false, issues } instead of a tool-input rejection.
  inputSchema: ValidateExpenseInputSchema,
});
