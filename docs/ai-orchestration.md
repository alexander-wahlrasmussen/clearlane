# AI orchestration — evidence-backed answers with Claude

Non-negotiable: **the model never produces a number.** It maps a question onto
a strict interpretation schema; every figure is computed deterministically from
declaration data, and every answer links to the exact declarations it was
computed from. If the data cannot support the question, the answer says so.

## The two-step split

1. **Interpret** (`POST /ask/interpret`, model involved)
   Claude is called with `ASK_SYSTEM_PROMPT` and the single tool
   `interpret_question` (both exported from src/ai/claude-ask-engine.ts),
   with `tool_choice` forced. The tool schema mirrors the
   `Interpretation` union in src/ai/ask-types.ts: aggregate (metric, period,
   country, type, grouping, goods filter, origin), compare (field + two sides),
   or list (awaiting / gaps / stale / attention). Anything the schema cannot
   express must set `lowConfidence` with a plain British-English message.

2. **Compute** (`POST /ask/compute`, no model)
   The interpretation drives a deterministic query — in this prototype
   src/ai/answer-compute.ts over the in-memory dataset; in production the same
   logic as SQL against the declarations store. The result always includes
   `evidenceMrns`, the complete list of declarations used. When the user edits
   the interpretation chips, only this step re-runs.

This split is why the UI can honestly show "✓ Computed from source data": the
model's output is inspectable (the chips ARE the interpretation), and the
numbers are reproducible from the evidence list.

## Engines in this repo

| Engine | Use | Model location |
|---|---|---|
| `MockAskEngine` | default local dev, tests | none — keyword interpreter |
| `ApiAskEngine` | production path | server-side via /ask/interpret |
| `AnthropicDevAskEngine` | local demos with a personal API key | browser → Anthropic API directly (`anthropic-dangerous-direct-browser-access`; never ship) |

Select via `VITE_ASK_ENGINE` (see .env.example). Production builds refuse `anthropic-dev`
(src/main.tsx) because `VITE_*` variables are inlined into the bundle.

## Hosting Claude inside the Microsoft estate

The backend can call Claude either through the Anthropic API directly or
through **Azure AI Foundry**, which offers Claude models with Azure-side
billing, networking and compliance. The engine seam does not care; only the
server's HTTP client changes.

## Guardrails to carry into the backend

- Force the tool call; reject responses without a valid `interpret_question`.
- Validate the tool output against the schema (enums, ISO codes, regex) before
  computing — treat the model as untrusted input. The client already does this
  in src/ai/interpretation-guard.ts for both engines; the server must do the
  same before answering `/ask/interpret`.
- The model never sees declaration values — only the question. No customer
  data leaves the query path.
- Log question → interpretation pairs for evaluation; the low-confidence rate
  is the quality metric that matters.
- No advice, predictions, classification or risk scoring — the system prompt
  forbids it, and the schema cannot express it.

## Wiring a real model — step by step

### 1. Two-minute demo (local only)

```bash
cp .env.example .env.local
# VITE_ASK_ENGINE=anthropic-dev
# VITE_ANTHROPIC_API_KEY=sk-ant-...        # personal key; visible to the page
# VITE_ANTHROPIC_MODEL=claude-opus-5        # default
npm run dev
```

The browser calls the Anthropic API directly (`AnthropicDevAskEngine`). Good
for showing stakeholders the concept against a real model; refused in
production builds.

### 2. Production: `POST /ask/interpret` on the backend

`ApiAskEngine` is already the production client; set `VITE_ASK_ENGINE=api` and
`VITE_API_BASE`. The backend owns the key and makes the call. Minimal
reference implementation (Node/TypeScript, `npm i @anthropic-ai/sdk`):

```ts
import Anthropic from '@anthropic-ai/sdk';
import { ASK_SYSTEM_PROMPT, INTERPRET_TOOL, toolOutputToInterpretation } from './claude-ask-engine';

const client = new Anthropic(); // ANTHROPIC_API_KEY from the server environment

export async function interpret(question: string) {
  const res = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 1024,
    output_config: { effort: 'low' },        // schema-fill task; no deep reasoning needed
    system: [{ type: 'text', text: ASK_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    tools: [{ ...INTERPRET_TOOL, strict: true }],
    tool_choice: { type: 'tool', name: 'interpret_question' },
    messages: [{ role: 'user', content: question }],
  });
  if (res.stop_reason === 'refusal') throw new Error('Model declined the question');
  const toolUse = res.content.find((b) => b.type === 'tool_use');
  if (!toolUse) throw new Error('Model did not return an interpretation');
  // toolOutputToInterpretation runs interpretation-guard — invalid output throws, never reaches the UI.
  return toolOutputToInterpretation(question, toolUse.input as Parameters<typeof toolOutputToInterpretation>[1]);
}
```

Notes:

- `strict: true` guarantees `tool_use.input` validates against the schema.
  It requires `additionalProperties: false` and a `required` list on
  `INPUT_SCHEMA`; add `additionalProperties: false` to `INTERPRET_TOOL` when
  you enable it.
- The system prompt is stable, so cache it (`cache_control`); the question is
  the only volatile part of the request.
- Log `question → interpretation` and the low-confidence rate; that is the
  quality metric.
- Wrap the endpoint in the same Entra bearer-token check as `/declarations`.

### 3. Same code inside the Azure estate

Swap the client for Azure AI Foundry; nothing else changes:

```ts
import AnthropicFoundry from '@anthropic-ai/foundry-sdk';
const client = new AnthropicFoundry({ /* resource + credentials from the environment */ });
```

Model ids and the `messages.create` call are identical.
