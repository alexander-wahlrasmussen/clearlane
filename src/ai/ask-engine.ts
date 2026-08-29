import type { InterpretedQuestion } from './ask-types';

/**
 * Turns a natural-language question into a structured Interpretation.
 * That is ALL an engine does — it never computes numbers and never sees
 * declaration values. Answers are always computed deterministically by
 * answer-compute.ts from the interpretation.
 *
 * Implementations:
 *  - MockAskEngine        deterministic keyword interpreter, no network
 *  - ApiAskEngine         POST /ask/interpret — Claude runs server-side (production)
 *  - AnthropicDevAskEngine direct browser call to the Anthropic API (local demos only)
 */
export interface AskEngine {
  interpret(question: string): Promise<InterpretedQuestion>;
}
