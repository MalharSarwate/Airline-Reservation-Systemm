import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import App from './App';
const renderApp = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={['/flights']}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
afterEach(() => vi.unstubAllGlobals());
it('shows search and a useful empty result', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async (url: string) =>
        new Response(
          JSON.stringify(
            url.includes('airports')
              ? []
              : url.includes('fares')
                ? []
                : { content: [], totalPages: 0, totalElements: 0, number: 0 },
          ),
        ),
    ),
  );
  renderApp();
  expect(
    screen.getByRole('button', { name: /Search flights/ }),
  ).toBeInTheDocument();
  expect(
    await screen.findByText('No flights match this search'),
  ).toBeInTheDocument();
});
it('shows an actionable error when the API fails', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new Error('Backend offline')),
  );
  renderApp();
  expect(await screen.findByRole('alert')).toHaveTextContent('Backend offline');
});
