// Sanity-checks an expense submission before the model decides.
// claimed_amount must equal sum(line_items); missing/empty line_items ⇒ sum 0.
import { defineTool } from "eve/tools";
import { z } from "zod";
import { ExpenseLineItemSchema } from "../lib/expense.schema.js";

export interface tValidateExpenseInput {
  category: string;
  claimed_amount: number;
  company_id: string;
  line_items?: readonly { label: string; amount: number }[];
}

export interface tValidateExpenseResult {
  issues: string[];
  missing_fields: string[];
  valid: boolean;
}

const ValidateExpenseInputSchema = z
  .object({
    category: z.string().min(1),
    claimed_amount: z.number(),
    company_id: z.string().min(1),
    line_items: z.array(ExpenseLineItemSchema).optional(),
  })
  .superRefine((data, ctx) => {
    const items = data.line_items ?? [];
    const sum = items.reduce((s, i) => s + i.amount, 0);
    if (sum !== data.claimed_amount) {
      ctx.addIssue({
        code: "custom",
        message: `claimed_amount (${data.claimed_amount}) does not match line_items sum (${sum})`,
        path: ["claimed_amount"],
      });
    }
  });

/** Pure validation used by the tool (exported for unit tests). */
export function validateExpense(
  input: tValidateExpenseInput
): tValidateExpenseResult {
  const parsed = ValidateExpenseInputSchema.safeParse(input);
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
  description:
    "Sanity-check an expense submission before deciding. Confirms core fields and that " +
    "claimed_amount equals the sum of line_items (0 when line_items are missing or empty).",
  execute({ company_id, category, claimed_amount, line_items }) {
    return validateExpense({
      category,
      claimed_amount,
      company_id,
      line_items,
    });
  },
  inputSchema: z.object({
    category: z.string().min(1).describe("The submission's category."),
    claimed_amount: z.number().describe("The total amount claimed."),
    company_id: z.string().min(1).describe("The submission's company_id."),
    line_items: z
      .array(ExpenseLineItemSchema)
      .optional()
      .describe(
        "Optional line items; their amounts must sum to claimed_amount."
      ),
  }),
});
