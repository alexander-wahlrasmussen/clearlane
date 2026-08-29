import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Vitest does not expose globals, so Testing Library cannot auto-register its
// afterEach cleanup — without this, rendered trees leak between tests.
afterEach(cleanup);
