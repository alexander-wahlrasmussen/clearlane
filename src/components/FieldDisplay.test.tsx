import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FieldCell, FieldStateChip } from './FieldDisplay';
import { fv, NOT_POPULATED } from '../domain/field-value';

describe('FieldDisplay', () => {
  it('renders the value when present', () => {
    render(<FieldCell field={fv(1234)} render={(v) => v.toLocaleString('en-GB')} />);
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('renders a labelled chip for a missing value — never a blank', () => {
    render(<FieldCell field={NOT_POPULATED} />);
    expect(screen.getByText('Not populated')).toBeInTheDocument();
  });

  it('labels all four states in plain English', () => {
    render(
      <>
        <FieldStateChip state="not-applicable" />
        <FieldStateChip state="not-available" />
        <FieldStateChip state="not-populated" />
        <FieldStateChip state="not-verified" />
      </>,
    );
    for (const label of ['Not applicable', 'Not available', 'Not populated', 'Not verified']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
