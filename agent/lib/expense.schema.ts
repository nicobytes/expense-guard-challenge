// Zod schemas for expense submissions (request) and review decisions (agent output).
import { z } from "zod";

export const ExpenseLineItemSchema = z.object({
  amount: z.number(),
  label: z.string().min(1),
});

export const ExpenseSubmissionSchema = z.object({
  category: z.string().min(1),
  chat_id: z.string().optional(),
  claimed_amount: z.number(),
  company_id: z.string().min(1),
  currency: z.string().min(1).optional(),
  label: z.string().optional(),
  line_items: z.array(ExpenseLineItemSchema).optional(),
  receipt: z.string().min(1),
  workspace_id: z.string().optional(),
});

export type tExpenseLineItem = z.infer<typeof ExpenseLineItemSchema>;
export type tExpenseSubmission = z.infer<typeof ExpenseSubmissionSchema>;

export const DECISIONS = ["approve", "flag_for_review", "reject"] as const;

export const ExpenseDecisionSchema = z.object({
  category: z.string().describe("The expense category as understood."),
  cited_rule: z
    .string()
    .min(1)
    .describe(
      "The specific company policy rule (id and limit) the decision relies on."
    ),
  claimed_amount: z
    .number()
    .describe("The total amount claimed, in the receipt currency."),
  decision: z.enum(DECISIONS).describe("The review outcome."),
  reason: z.string().min(1).describe("Short explanation for the decision."),
});

export type tExpenseDecision = z.infer<typeof ExpenseDecisionSchema>;
