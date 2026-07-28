# Eval failure investigation
_Exported on 7/28/2026 at 09:33:21 GMT-4 from Cursor (3.13.21)_

---

**User**

✗  decision/0003  gates 2/3
  ✗ matches
[expense-guard] step usage {
  inputTokens: 2911,
  outputTokens: 546,
  cacheReadTokens: 2490,
  cacheWriteTokens: 419
}

tengo un eval fallando por que? 

---

**Cursor**

Voy a revisar el eval que falla (`decision/0003`, gate `matches`) y el contexto del runner para ver por qué.

`decision/0003` es el caso `illegible`. Revisaré el fixture y qué decisión está devolviendo el agente.

Confirmado: `decision/0003` es el caso cross-company. Voy a contrastar lo que esperaba el eval con lo que devolvió el agente.

Falla el gate `matches` en **`decision/0003`**, que es el caso **cross-company** (Initech meal $40), no `illegible`.

### Qué esperaba vs qué salió

| | |
|---|---|
| **Fixture** | `fixtures/cross-company.json` — Initech, meals, $40 |
| **Esperado** | `approve` |
| **Obtuvo** | `flag_for_review` |

Por eso: `gates 2/3` → `didNotFail` ✅, `calledTool(search_policy)` ✅, `matches` ❌.

### Por qué el modelo flagueó

Hizo bien el lookup de Initech (`MEAL-01`: **$25 por attendee**). Luego razonó:

1. $40 > $25 si hay 1 attendee  
2. `"Burgers x2"` sugiere 2 attendees → límite $50, cabría el $40  
3. Pero el headcount no está explícito → `flag_for_review`

### Contexto extra

En un run anterior este caso “pasó” con `approve`, pero citando la regla de **Acme** ($50/attendee) — falso positivo de aislamiento. Ahora usa la política correcta de Initech y el eval choca con `expect_decision: approve`.

En resumen: no es un bug de `validate_expense`; es **ambigüedad del fixture** (2 burgers vs límite per-attendee) vs una expectativa de `approve` demasiado rígida. O se aclara el recibo/número de attendees, o se cambia el expect a `flag_for_review`.

---

**User**

pero aqui tengo el expeted @cases.yaml (10-13)  a flag_for_review

---

**Cursor**

Ese bloque es **`illegible`**, pero el que falló no es ese.

Eve numera los casos del fan-out desde `0000`:

| id eval | fila en `cases.yaml` | expect |
|---|---|---|
| `decision/0000` | valid | approve |
| `decision/0001` | ambiguous | flag_for_review |
| `decision/0002` | **illegible** (líneas 10–13) | flag_for_review |
| `decision/0003` | **cross-company** | **approve** |

El fail `decision/0003` / `matches` es **cross-company**: esperaba `approve` y el modelo devolvió `flag_for_review` por la ambigüedad de attendees en Initech MEAL-01 ($25/persona vs $40 con “Burgers x2”).

`illegible` sería `decision/0002`, no `0003`.

---

**User**

ok vuelve a corre las priebas

---

**Cursor**

Reejecuto la suite de evals.

Hay un `eve dev` corriendo; reviso cómo lanzar los evals sin chocarlo.

Ya hay un `eve eval` en curso (pid 17612). Voy a ver su progreso.

Ya hay un `eve eval` corriendo; espero a que termine.

---

**User**

ya lo cerre corre de nuevo

---

**Cursor**

Esta vez devolvió `approve`, pero `matches` sigue fallando — reviso el detalle del gate.

**8 passed, 1 failed** (`decision/0003`).

En este run el modelo devolvió **`approve`** (Initech, $40, “Burgers x2” → 2 attendees × $25 = $50).

Pero en `cases.yaml` **cross-company** ahora tiene `expect_decision: flag_for_review`, así que `matches` falla.

Es flaky: a veces flaguea por ambigüedad de attendees, a veces aprueba asumiendo 2. El expect y el fixture no están alineados de forma estable.

---

**User**

como podemos hacer? creo podemos ajustar un poco el prompt para ver esta clase de ambigüedad

---

**Cursor**

Tiene sentido. Voy a mirar el prompt y el fixture para proponerte un ajuste concreto.

Sí: el prompt ya dice “ambiguous → flag”, pero no define **qué cuenta como ambigüedad** cuando la política es *per attendee* y el recibo solo implica headcount (`Burgers x2`). Por eso a veces aprueba y a veces flaguea.

### Recomendación

Ajusta la **rubric** en `build-instructions.ts` para exigir evidencia explícita en hechos de los que depende el límite. Algo en esta línea:

```text
When a policy limit depends on a fact (attendees, nights, quantity, etc.):
- If that fact is explicitly stated on the receipt or submission, use it.
- If you would have to infer it (e.g. "Burgers x2" ⇒ 2 attendees), treat it as
  ambiguous and choose flag_for_review — do not approve on an inference.
- Only approve when the claim is within the limit under the most conservative
  reading that the receipt actually supports (e.g. assume 1 attendee unless
  headcount is stated).
```

Con eso, cross-company ($40 > $25 × 1 attendee implícito) debería converger a `flag_for_review`, alineado con tu `expect_decision` actual.

### También alinea el dataset

En `cases.yaml`, la description de cross-company todavía dice *“approved”* pero el expect es `flag_for_review`. Conviene actualizarla (p. ej. *“Initech meal over single-attendee limit with inferred headcount is flagged”*) para no mentirte a ti mismo en el eval.

### Alternativa (si quieres `approve` estable)

No pelear con el prompt: haz el fixture inequívoco (`Attendees: 2` en el recibo) y deja `expect_decision: approve`. Eso prueba mejor el aislamiento de tenant; la ambigüedad de headcount sería otro caso.

Para este flake, el ajuste de prompt + expect `flag_for_review` es la opción más coherente con lo que ya tienes. Si quieres que lo implemente, cambia a Agent mode.

---

**User**

seria ajustar el promt pero al poner el ejemplo en burgers x2 estas haciendo overfiting es decir con el ejemplo exacto va a pasar cambia eso a algo mas generico para cubrir mas casos y no solo este

---

**Cursor**

Queda claro: regla genérica, sin ejemplos del fixture. Armo el plan.

---

**User**

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

---

**Cursor**

Implemento la regla genérica de ambigüedad en el prompt y alineo el dataset.

Listo. Cambios:

1. **`build-instructions.ts`** — regla genérica: si el límite depende de un hecho no explícito (attendees, nights, units, duration), `flag_for_review`; sin ejemplos del fixture.
2. **`cases.yaml`** — description de cross-company alineada con `flag_for_review`.

**Evals: 9/9 passed**, incluido `decision/0003`.

---

**User**

pon este caso como parte de los @FINDINGS.md 

---

**Cursor**

Documento el caso como finding #7, en el mismo estilo que los anteriores.

Añadí **## 7. Flaky cross-company decision when policy facts are inferred** en `FINDINGS.md`, con Found / Confirmed / Fixed / Why al estilo de los demás.

