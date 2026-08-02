// Static system prompt every turn (cache-friendly). Side-effect only: seed
// submissionState from channel metadata when the HTTP review path provides it.
// Evals pass the submission via clientContext.expense_submission (hint in system).
import { defineDynamic, defineInstructions } from "eve/instructions";
import { buildSystemPrompt } from "../lib/build-instructions.js";
import {
  hasChannelSubmission,
  resolveExpenseSubmission,
  setSubmissionState,
} from "../lib/request-context.js";

const SYSTEM_PROMPT = buildSystemPrompt();

export default defineDynamic({
  events: {
    "turn.started": (_event, ctx) => {
      const meta = ctx.channel.metadata;
      if (hasChannelSubmission(meta)) {
        setSubmissionState(resolveExpenseSubmission(meta));
      } else {
        setSubmissionState(null);
      }

      return defineInstructions({
        markdown: SYSTEM_PROMPT,
      });
    },
  },
});
