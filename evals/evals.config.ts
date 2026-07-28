// Run-wide eval configuration for Expense Guard. Each eval case loads its own
// fixture explicitly (evals/data/cases.yaml) and passes it via clientContext.
import { defineEvalConfig } from "eve/evals";

export default defineEvalConfig({
  judge: {
    model: "anthropic/claude-haiku-4-5",
  },
  maxConcurrency: 2,
  timeoutMs: 120_000,
});
