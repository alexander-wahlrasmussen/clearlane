import { mapDeclaration } from '../api/mapping';
import { generateDeclarations } from '../mocks/synthetic-data';
import type { Declaration } from '../domain/declaration';

let cache: Declaration[] | null = null;

/** Deterministic mapped dataset for tests — same data the mock client serves. */
export function testDeclarations(): Declaration[] {
  cache ??= generateDeclarations().map(mapDeclaration);
  return cache;
}
