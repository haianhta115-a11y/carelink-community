import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { FilterBar } from '../components/FilterBar';
import { StatusStepper } from '../components/RequestComponents';
import { vi } from '../locales/vi';
function QueryViewer() {
  return <output aria-label="query">{useLocation().search}</output>;
}
describe('request discovery and progress', () => {
  it('syncs combined filters to the URL and clears them', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <FilterBar
          categories={[
            {
              id: 1,
              name: 'Y tế',
              slug: 'health',
              icon: 'HeartPulse',
              groupKey: 'health',
              description: 'Chăm sóc sức khỏe',
            },
          ]}
        />
        <QueryViewer />
      </MemoryRouter>,
    );
    await user.type(screen.getByRole('textbox', { name: vi.requests.keyword }), 'đưa đón');
    await waitFor(() => expect(screen.getByLabelText('query').textContent).toContain('keyword='));
    await user.selectOptions(screen.getByLabelText(vi.requests.category), '1');
    expect(screen.getByLabelText('query').textContent).toContain('categoryId=1');
    await user.click(screen.getByRole('button', { name: vi.requests.clearFilters }));
    expect(screen.getByLabelText('query').textContent).toBe('');
    expect(screen.getByRole('textbox', { name: vi.requests.keyword })).toHaveValue('');
  });
  it('identifies the current step with text and accessible state', () => {
    render(<StatusStepper status="InProgress" />);
    const step = screen.getByText(vi.statuses.InProgress).closest('li');
    expect(step).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText(vi.statuses.Completed).closest('li')).not.toHaveAttribute('aria-current');
  });
});
