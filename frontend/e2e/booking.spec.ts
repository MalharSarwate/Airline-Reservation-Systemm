import { test, expect } from '@playwright/test';

test('two travellers register, explore 3D, pay, download a ticket and cancel', async ({
  page,
}) => {
  await page.goto('/flights');
  await expect(
    page.getByRole('link', { name: 'Choose flight →' }).first(),
  ).toBeVisible();
  await page.screenshot({
    path: 'test-results/flights-redesign.png',
    fullPage: true,
  });
  await page.getByRole('combobox', { name: /Travellers/ }).selectOption('2');
  await page.getByRole('button', { name: 'Search flights ↗' }).click();
  await expect(
    page.getByRole('link', { name: 'Choose flight →' }).first(),
  ).toHaveAttribute('href', /passengers=2/);
  await page.getByRole('link', { name: 'Choose flight →' }).first().click();
  await page
    .getByRole('link', { name: 'Sign in or create an account →' })
    .click();
  await page
    .getByRole('button', { name: 'New here? Create an account' })
    .click();
  await page.screenshot({
    path: 'test-results/auth-redesign.png',
    fullPage: true,
  });
  await page.getByLabel('Full name', { exact: true }).fill('E2E Traveller');
  await page.getByLabel('Email address').fill(`e2e-${Date.now()}@example.test`);
  await page
    .getByLabel('Password', { exact: true })
    .fill('Demo-Test-Password-123');
  await page
    .getByRole('button', { name: 'Create account →', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Who’s travelling?' }),
  ).toBeVisible();
  await page
    .getByLabel('Full name', { exact: true })
    .nth(0)
    .fill('Alex Traveller');
  await page.getByLabel('Date of birth').nth(0).fill('1994-04-12');
  await page
    .getByLabel('Full name', { exact: true })
    .nth(1)
    .fill('Sam Traveller');
  await page.getByLabel('Date of birth').nth(1).fill('1996-08-20');
  await page
    .getByRole('button', { name: 'Choose your seats →', exact: true })
    .click();
  await page.getByRole('button', { name: '2D map', exact: true }).click();
  const seats = page.getByRole('button', {
    name: /Seat \d+[A-H], ECONOMY, AVAILABLE/,
  });
  await seats.first().click();
  await expect(page.getByText(/Held \d+:\d+/)).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: /Seat .* SELECTED/ }),
  ).toHaveCount(1);
  await seats.and(page.locator('[aria-pressed="false"]')).first().click();
  await expect(page.getByText(/Held \d+:\d+/)).toHaveCount(2);
  await page
    .getByRole('button', { name: 'Help me choose ↗', exact: true })
    .click();
  await expect(page.getByText('OPTION 01', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Reserve this plan', exact: true })
    .first()
    .click();
  await expect(
    page.getByRole('button', { name: 'Continue to extras →' }),
  ).toBeEnabled();
  await expect(page.getByText(/Held \d+:\d+/)).toHaveCount(2);
  await page.getByLabel('Compare seat A', { exact: true }).selectOption('6A');
  await page.getByLabel('Compare seat B', { exact: true }).selectOption('6F');
  await expect(
    page.getByRole('button', { name: 'See passenger view 6A ↗', exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: 'test-results/seat-planner.png',
    fullPage: true,
  });
  await page
    .getByRole('button', { name: 'See passenger view 6A ↗', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Passenger view 6A', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page
    .getByRole('button', { name: 'Close planner −', exact: true })
    .click();
  await page.getByRole('button', { name: '3D cabin', exact: true }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Passenger view/ }),
  ).toBeEnabled();
  await expect(page.locator('.canvas')).toHaveAttribute(
    'data-camera-ready',
    'true',
    { timeout: 15000 },
  );
  await page.screenshot({
    path: 'test-results/cabin-overview.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: /Passenger view/ }).click();
  await expect(
    page.getByRole('button', { name: /Passenger view/ }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.canvas')).toHaveAttribute(
    'data-camera-ready',
    'true',
    { timeout: 15000 },
  );
  await page.screenshot({
    path: 'test-results/passenger-view.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Continue to extras →' }).click();
  await page.getByLabel('Extra baggage').first().selectOption('BAG_10');
  await page
    .getByRole('combobox', { name: /^Meal/ })
    .first()
    .selectOption('MEAL_VEG');
  await page.getByLabel('Payment result').selectOption('DECLINE');
  await page.getByRole('button', { name: /Confirm & pay/ }).click();
  await expect(page.getByRole('alert')).toContainText('Mock payment declined');
  await page.getByLabel('Payment result').selectOption('APPROVE');
  await page.getByRole('button', { name: /Confirm & pay/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Your journey is booked.' }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: 'View booking & download e-ticket →' })
    .click();
  await expect(page.getByText('Alex Traveller', { exact: true })).toBeVisible();
  await page.screenshot({
    path: 'test-results/bookings-redesign.png',
    fullPage: true,
  });
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download e-ticket ↓' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^ticket-.*\.pdf$/);
  await page
    .getByRole('button', { name: 'Cancel booking', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Yes, cancel booking', exact: true })
    .click();
  await expect(page.getByText('CANCELLED', { exact: true })).toBeVisible();
});

test('mobile search remains usable and navigation protects bookings', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flights');
  await expect(
    page.getByRole('button', { name: 'Search flights ↗' }),
  ).toBeVisible();
  await page.screenshot({
    path: 'test-results/mobile-search.png',
    fullPage: true,
  });
  await page.getByRole('link', { name: 'My bookings', exact: true }).click();
  await expect(page.getByText('Sign in to see your bookings.')).toBeVisible();
});

test('landing page links to search and motion can be paused', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Go beyond/ })).toBeVisible();
  await page.getByRole('button', { name: 'Pause animation Ⅱ' }).click();
  await expect(
    page.getByRole('button', { name: 'Resume animation ▷' }),
  ).toBeVisible();
  await page.screenshot({ path: 'test-results/landing.png', fullPage: true });
  await page.getByRole('link', { name: 'Find your next flight ↗' }).click();
  await expect(page).toHaveURL(/\/flights$/);
});
