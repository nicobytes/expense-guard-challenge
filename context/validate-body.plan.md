# Validate Body

Encontre que si al endpoint de review le envias datos que no son validos, igual procesa el review y devuelve el resultado, asi:

```
curl --location 'http://127.0.0.1:2000/eve/v1/review' \
--header 'Content-Type: application/json' \
--header 'Cookie: dmid=798dad76-eb52-4b4d-aace-47c2dd766892' \
--data '{
    "company_id": "acme",
    "label": "production"
}'
```

Response:

```json
{
    "ok": true,
    "data": {
        "decision": "reject",
        "reason": "Incomplete submission: no line items, no category specified, and no receipt provided. Cannot process empty expense claim.",
        "cited_rule": "N/A - submission incomplete",
        "category": "unspecified",
        "claimed_amount": 0
    }
}
```

Una optimizacion a hacer es validar el body antes de procesar el review con un schema de zod para que con ello no se haga una llamada innecesaria al modelo.