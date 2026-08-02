# Model evaluation and caching
_Exported on 8/2/2026 at 08:07:44 GMT-4 from Cursor (3.14.7)_

---

**User**

Evaluando mi mo modelo e instrucciones  @agent/agent.ts @agent/instructions tengo problemas de el costo beneficio hay ser un agent que solo evalua el modelo de Sonnet 4.5 deberia duncionar mejor y ademas tiene un mejor umbral de caching.

Y en cuanto a mis intuscciones tengo un error grave aqui @build-instructions.ts (83-93)  por todo lo dinamico esta de primero y lo estatico al final eso invalida el cache de los modelos y hace que sea mas costoso.

Entonces revisa que reviewInstructions() = (header/steps/rubric). sea estatico y sin cosas dinamicas

lee esta doc https://platform.claude.com/docs/en/build-with-claude/prompt-caching  y suguiereme un plan usando /spec-driven-development 

---

**Cursor**

Voy a revisar el agente, las instrucciones y la doc de prompt caching para armar un spec/plan concreto sobre el orden estático→dinámico.

El umbral de cache de Sonnet 4.5 es 1024 tokens; el bloque estático actual es ~400 — voy a ver si Eve cachea tools/system y cuál es el ID exacto del modelo.

Confirmado: `reviewInstructions()` ya es 100% estático; el problema es el orden de ensamblaje y el modelo Opus. Armo el spec/plan SDD.

---

**User**

si bien dejar lo estatico primero es una buena opcion osea esta:

export function buildSystemPrompt(submission: tExpenseSubmission, now: Date): string {
  return stripIndent`
    ${reviewInstructions()}

    ${renderSubmission(submission, now)}
  `.trim();
}

la parte de  ${renderSubmission(submission, now)} no deberia mantenerse como parte del mensaje el user? con eso el system prompt queda aun mas limpio?

---

**Cursor**

Sí: meter la submission en el user message deja el system 100% estático y maximiza el cache. Actualizo el plan con ese enfoque.

Confirmado: con la submission en el user message el `system` queda idéntico entre requests y es lo que más aprovecha el cache. Actualizo el plan.

Sí — es la opción más limpia para cache.

Reordenar static→dynamic **dentro** del system ayuda poco si todo sigue en un solo bloque: al cambiar la submission, el hash del `system` cambia y se invalida ese nivel. Anthropic cachea `tools → system → messages`; lo estable debe quedar en `system`, lo por-request en el user message.

**Diseño actualizado en el plan:**

| Capa | Contenido |
|------|-----------|
| `system` | Solo `reviewInstructions()` (+ hint estático de `clientContext` para evals) |
| user (HTTP) | `Current date` + JSON de submission + CTA vía `buildReviewUserMessage` |
| evals | Siguen con `clientContext.expense_submission` (sin reescribir todos los evals) |

En [`review.ts`](agent/channels/review.ts) el `send` deja de usar el mensaje genérico y pasa a llevar el payload.

Si te late este enfoque, dime y lo implementamos.

---

**User**

si me gusta el plan vamos por ello y probamos

---

**Cursor**

Implementamos el plan: system estático, submission en el user message, y Sonnet 4.5.

Quedé bloqueado en plan mode: no puedo editar TypeScript hasta que Cursor permita el cambio a Agent mode.

Aprueba el switch a **Agent** (o cámbialo tú en el selector de modo) y sigo con la implementación de inmediato.

---

**User**

ya cambie a modo agent

---

**Cursor**

Implemento el plan ahora.

Lint y build OK. Arranco el server y hago un smoke review.

Listo y verificado.

**Cambios**
- Modelo → `anthropic/claude-sonnet-4.5`
- System = solo rol/rúbrica + hint estático de `clientContext` (sin fecha ni submission)
- HTTP: payload en `buildReviewUserMessage` → `send({ message })`
- Tests + FINDINGS #10

**Smoke** (`fixtures/valid.json` ×2): ambas → `approve`

**Cache (usage log):**
| Step | cacheRead | cacheWrite |
|------|-----------|------------|
| 1er review, step 1 | 0 | 2269 (write inicial) |
| 1er review, step 2 | 2269 | 357 |
| 2º review, step 1 | 1654 | 615 |
| 2º review, step 2 | 2269 | 358 |

El prefijo estático se reutiliza entre steps y entre reviews. El `dev` server sigue corriendo en background.

---

**User**

corramos los evals

---

**Cursor**

Hay un `eve dev` corriendo; lo detengo y lanzo los evals.

**9/9 passed** (19 gates) en ~1m 21s.

- `decision/*` — 4/4  
- `policy-citation/*` — 4/4 (judge 100%)  
- `tenant-isolation` — 3/3  

Sonnet 4.5 + system estático se comportan bien en el suite.

---

**User**

<timestamp>Sunday, Aug 2, 2026, 8:02 AM (UTC-4)</timestamp>
<system_notification>
The following task has finished. If you were already aware, ignore this notification and do not restate prior responses.

<task>
kind: shell
status: success
task_id: 731439
title: Start eve dev server
tool_call_id: call-b961c453-1154-4358-95d1-ba556b6ef960-86
fc_ouaifZJ-2byqsH-3ee8ae4a-aws_uw2_1
output_path: /Users/nicobytes1/.cursor/projects/Users-nicobytes1-Work-nicobytes-expense-guard-challenge/terminals/731439.txt
</task>
</system_notification>
<user_query>Briefly inform the user about the task result and perform any follow-up actions (if needed). If there's no follow-ups needed, don't explicitly say that.</user_query>

---

**Cursor**

El `eve dev` que habíamos dejado en background ya terminó (lo detuvimos para poder correr los evals). Los evals quedaron en **9/9 passed**.

