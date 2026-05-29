import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Field } from '@/components/Form/Field';
import { Input } from '@/components/ui/input';

describe('Field', () => {
  it('links the label, description, and error to the wrapped control', () => {
    render(
      <Field label="Amount" description="Enter the transfer amount." error="Amount is required">
        <Input />
      </Field>
    );

    const input = screen.getByLabelText('Amount');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toContain(
      screen.getByText('Enter the transfer amount.').id
    );
    expect(input.getAttribute('aria-describedby')).toContain(
      screen.getByText('Amount is required').id
    );
  });

  it('uses the child id when one is provided', () => {
    render(
      <Field label="Recipient">
        <Input id="recipient-address" />
      </Field>
    );

    expect(screen.getByLabelText('Recipient')).toHaveAttribute('id', 'recipient-address');
  });

  it('supports render-prop controls with custom markup', () => {
    render(
      <Field label="Note" description="Visible only to you.">
        {({ controlProps }) => (
          <div>
            <textarea {...controlProps} />
            <span>140</span>
          </div>
        )}
      </Field>
    );

    const textarea = screen.getByLabelText('Note');

    expect(textarea).toHaveAttribute(
      'aria-describedby',
      screen.getByText('Visible only to you.').id
    );
    expect(screen.getByText('140')).toBeInTheDocument();
  });
});
