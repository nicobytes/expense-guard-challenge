// Custom review channel (id: review). POST /eve/v1/review runs one structured
// review turn and returns the decision. Per-request context flows body ->
// channel state -> metadata(state) -> instructions resolver (ctx.channel.metadata).
// Bodies must be a complete expense submission (Zod); empty/invalid → 400.

import {
  defineChannel,
  POST,
  type SendPayload,
  type Session,
} from "eve/channels";
import { z } from "zod";
import { buildReviewUserMessage } from "../lib/build-instructions.js";
import {
  ExpenseDecisionSchema,
  ExpenseSubmissionSchema,
} from "../lib/expense.schema.js";
import {
  buildRequestView,
  isNonEmptyObject,
  type tRequestView,
} from "../lib/request-context.js";

type tJsonOutputSchema = NonNullable<SendPayload["outputSchema"]>;

// eve expects a run-scoped JSON schema (not a Zod object) on the send payload.
function toJsonSchema(schema: z.ZodType): tJsonOutputSchema {
  const { $schema: _schema, ...rest } = z.toJSONSchema(schema) as Record<
    string,
    unknown
  >;
  return rest as tJsonOutputSchema;
}

interface tStreamEvent {
  data?: { result?: unknown; message?: string; code?: string };
  type: string;
}

// Drain the turn's event stream once, capturing the structured result / terminal failure.
async function drainDecision(
  session: Session
): Promise<{ result: unknown; failure: string | null }> {
  const stream = await session.getEventStream();
  const reader = stream.getReader();
  let result: unknown;
  let failure: string | null = null;
  try {
    // Sequential stream drain — each chunk depends on the previous read.
    for (;;) {
      // biome-ignore lint/performance/noAwaitInLoops: ReadableStream must be read sequentially
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      const event = value as tStreamEvent;
      if (event.type === "result.completed") {
        result = event.data?.result;
      }
      if (event.type === "turn.completed") {
        break;
      }
      if (event.type === "turn.failed") {
        failure =
          `${event.data?.code ?? "unknown"} ${event.data?.message ?? ""}`.trim();
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }
  return { failure, result };
}

const outputSchema = toJsonSchema(ExpenseDecisionSchema);

export default defineChannel<
  tRequestView | undefined,
  { state: tRequestView | undefined }
>({
  context: (state) => ({ state }),
  metadata: (state) => ({
    contextProvided: state?.contextProvided ?? false,
    request: state?.request ?? null,
  }),
  routes: [
    POST("/eve/v1/review", async (request, { send }) => {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return Response.json(
          { error: "Invalid JSON body.", ok: false },
          { status: 400 }
        );
      }

      if (!isNonEmptyObject(body)) {
        return Response.json(
          {
            error:
              "Empty body. Send a complete expense submission JSON object.",
            ok: false,
          },
          { status: 400 }
        );
      }

      const parsed = ExpenseSubmissionSchema.safeParse(body);
      if (!parsed.success) {
        return Response.json(
          {
            error: "Invalid expense submission.",
            issues: parsed.error.issues,
            ok: false,
          },
          { status: 400 }
        );
      }

      const view = buildRequestView(parsed.data);
      const session = await send(
        {
          message: buildReviewUserMessage(parsed.data, new Date()),
          outputSchema,
        },
        {
          auth: null,
          continuationToken: `eve:${crypto.randomUUID()}`,
          state: view,
        }
      );

      const { result, failure } = await drainDecision(session);
      if (failure) {
        return Response.json(
          { error: `turn failed: ${failure}`, ok: false },
          { status: 502 }
        );
      }

      const decision = ExpenseDecisionSchema.safeParse(result);
      if (!decision.success) {
        return Response.json(
          {
            error: "Agent output did not match the decision schema.",
            ok: false,
          },
          { status: 502 }
        );
      }

      return Response.json({ data: decision.data, ok: true }, { status: 200 });
    }),
  ],
  state: { contextProvided: false, request: null },
});
