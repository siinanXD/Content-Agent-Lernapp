# AP-11 Pilotkurs MAF (seed / fixture)

Linear: [SIN-189](https://linear.app/sinan-kahraman/issue/SIN-189/ap-11-pilotkurs-maf-komplett)

## Scope this slice

Full **seed/fixture** pilot path without live Anthropic/OpenAI/Langfuse:

1. Create course keyword `Maschinen- und Anlagenführer`
2. Research (AO/RLP/Prüfung seeds)
3. Plan (2 variants)
4. Generate (Sicherheit Lernfeld seed)
5. Evaluate (fixture judge)
6. Publish (hard gate)

## Run

```bash
# app must be running on :43123
npm run pilot:maf
```

Or: `POST /api/pilot/maf`

## Kosten / Langfuse

- Deckel: **€20 / Kurslauf** (PRODUCT.md)
- Live cost + Langfuse dashboards: **deferred** until keys present
- Fixture run reports `mode: fixture` and `estimatedCostEur: 0` (no API calls)

## Acceptance (this boot)

- Pipeline completes with `publish.blocked === false` on seed content
- No IHK exam copies; sources are official AO/RLP links only
