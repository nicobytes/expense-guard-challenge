// Zod schemas for expense submissions (request) and review decisions (agent output).
import { z } from "zod";

export const ExpenseLineItemSchema = z.object({
  label: z.string().min(1),
  amount: z.number().finite(),
});

export const ExpenseSubmissionSchema = z.object({
  company_id: z.string().min(1),
  category: z.string().min(1),
  claimed_amount: z.number().finite(),
  receipt: z.string().min(1),
  currency: z.string().min(1).optional(),
  line_items: z.array(ExpenseLineItemSchema).optional(),
  workspace_id: z.string().optional(),
  chat_id: z.string().optional(),
  label: z.string().optional(),
});

export type tExpenseLineItem = z.infer<typeof ExpenseLineItemSchema>;
export type tExpenseSubmission = z.infer<typeof ExpenseSubmissionSchema>;

export const DECISIONS = ["approve", "flag_for_review", "reject"] as const;

export const ExpenseDecisionSchema = z.object({
  decision: z.enum(DECISIONS).describe("The review outcome."),
  reason: z.string().min(1).describe("Short explanation for the decision."),
  cited_rule: z
    .string()
    .min(1)
    .describe("The specific company policy rule (id and limit) the decision relies on."),
  category: z.string().describe("The expense category as understood."),
  claimed_amount: z.number().describe("The total amount claimed, in the receipt currency."),
});

export type tExpenseDecision = z.infer<typeof ExpenseDecisionSchema>;
