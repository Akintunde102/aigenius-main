import { fireEvent, screen } from '@testing-library/react';

/** DefaultToolStreamingCard starts collapsed; expand before asserting on JSON/output. */
export function expandDefaultToolCard(name?: RegExp | string): void {
    const collapsed = screen
        .getAllByRole('button')
        .filter((btn) => btn.getAttribute('aria-expanded') === 'false');
    const toggle =
        name != null
            ? collapsed.find((btn) => {
                  const label = btn.textContent ?? '';
                  return typeof name === 'string' ? label.includes(name) : name.test(label);
              }) ?? collapsed[0]
            : collapsed[0];
    if (toggle && toggle.getAttribute('aria-expanded') !== 'true') {
        fireEvent.click(toggle);
    }
}
