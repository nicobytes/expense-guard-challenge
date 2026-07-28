// Custom review channel (id: review). POST /eve/v1/review runs one structured
// review turn and returns the decision. Per-request context flows body ->
// channel state -> metadata(state) -> instructions resolver (ctx.channel.metadata).
// Bodies must be a complete expense submission (Zod); empty/invalid → 400.
import { z } from "zod";
import { defineChannel, POST, type Session, type SendPayload } from "eve/channels";
import { ExpenseDecisionSchema, ExpenseSubmissionSchema } from "../lib/expense.schema.js";
import { buildRequestView, isNonEmptyObject, type tRequestView } from "../lib/request-context.js";

type tJsonOutputSchema = NonNullable<SendPayload["outputSchema"]>;

// eve expects a run-scoped JSON schema (not a Zod object) on the send payload.
function toJsonSchema(schema: z.ZodType): tJsonOutputSchema {
  const { $schema, ...rest } = z.toJSONSchema(schema) as Record<string, unknown>;
  void $schema;
  return rest as tJsonOutputSchema;
}

type tStreamEvent = {
  type: string;
  data?: { result?: unknown; message?: string; code?: string };
};

// Drain the turn's event stream once, capturing the structured result / terminal failure.
async function drainDecision(session: Session): Promise<{ result: unknown; failure: string | null }> {
  const stream = await session.getEventStream();
  const reader = stream.getReader();
  let result: unknown;
  let failure: string | null = null;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      const event = value as tStreamEvent;
      if (event.type === "result.completed") result = event.data?.result;
      if (event.type === "turn.completed") break;
      if (event.type === "turn.failed") {
        failure = `${event.data?.code ?? "unknown"} ${event.data?.message ?? ""}`.trim();
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }
  return { result, failure };
}

const outputSchema = toJsonSchema(ExpenseDecisionSchema);

export default defineChannel<tRequestView | undefined, { state: tRequestView | undefined }>({
  state: { request: null, contextProvided: false },
  context: (state) => ({ state }),
  metadata: (state) => ({
    request: state?.request ?? null,
    contextProvided: state?.contextProvided ?? false,
  }),
  routes: [
    POST("/eve/v1/review", async (request, { send }) => {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return Response.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
      }

      if (!isNonEmptyObject(body)) {
        return Response.json(
          { ok: false, error: "Empty body. Send a complete expense submission JSON object." },
          { status: 400 },
        );
      }

      const parsed = ExpenseSubmissionSchema.safeParse(body);
      if (!parsed.success) {
        return Response.json(
          { ok: false, error: "Invalid expense submission.", issues: parsed.error.issues },
          { status: 400 },
        );
      }

      const view = buildRequestView(parsed.data);
      const session = await send(
        { message: "Review the expense submission and return your decision.", outputSchema },
        { auth: null, continuationToken: `eve:${crypto.randomUUID()}`, state: view },
      );

      const { result, failure } = await drainDecision(session);
      if (failure) {
        return Response.json({ ok: false, error: `turn failed: ${failure}` }, { status: 502 });
      }

      const decision = ExpenseDecisionSchema.safeParse(result);
      if (!decision.success) {
        return Response.json(
          { ok: false, error: "Agent output did not match the decision schema." },
          { status: 502 },
        );
      }

      return Response.json({ ok: true, data: decision.data }, { status: 200 });
    }),
  ],
});
