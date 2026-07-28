// Dynamic instructions resolver. Runs at turn open. Review HTTP seeds the submission
// via channel metadata; evals/Eve session pass it via clientContext.expense_submission
// (no silent fixture fallback).
import { defineDynamic, defineInstructions } from "eve/instructions";
import {
  buildClientContextSystemPrompt,
  buildSystemPrompt,
} from "../lib/build-instructions.js";
import {
  hasChannelSubmission,
  resolveExpenseSubmission,
  submissionState,
} from "../lib/request-context.js";

export default defineDynamic({
  events: {
    "turn.started": async (_event, ctx) => {
      const meta = ctx.channel.metadata;
      if (hasChannelSubmission(meta)) {
        const submission = resolveExpenseSubmission(meta);
        submissionState.update(() => submission);
        return defineInstructions({ markdown: buildSystemPrompt(submission, new Date()) });
      }

      submissionState.update(() => null);
      return defineInstructions({ markdown: buildClientContextSystemPrompt(new Date()) });
    },
  },
});
