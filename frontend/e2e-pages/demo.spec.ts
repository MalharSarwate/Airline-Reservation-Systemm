import { test, expect } from '@playwright/test';
test('public static demo runs the full booking flow without any backend', async ({
  page,
}) => {
  const apiRequests: string[] = [];
  page.on('request', (r) => {
    if (
      new URL(r.url()).pathname.startsWith('/api/') ||
      new URL(r.url()).pathname.startsWith('/actuator/')
    )
      apiRequests.push(r.url());
  });
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /Go beyond/ })).toBeVisible();
  await expect(page.getByLabel('Demo information')).toContainText(
    'Saved only in this browser',
  );
  await page.getByRole('link', { name: 'Find your next flight ↗' }).click();
  await expect(
    page.getByRole('link', { name: 'Choose flight →' }).first(),
  ).toBeVisible();
  await page.getByRole('combobox', { name: /Travellers/ }).selectOption('2');
  await page.getByRole('button', { name: 'Search flights ↗' }).click();
  await expect(
    page.getByRole('link', { name: 'Choose flight →' }).first(),
  ).toHaveAttribute('href', /passengers=2/);
  await page.getByRole('link', { name: 'Choose flight →' }).first().click();
  await page.getByRole('link', { name: 'Enter demo →', exact: true }).click();
  await expect(page.getByLabel('Demo display name')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Start demo →' }).click();
  for (const [i, name] of ['Alex Example', 'Sam Example'].entries()) {
    await page.getByLabel('Full name', { exact: true }).nth(i).fill(name);
    await page.getByLabel('Date of birth').nth(i).fill('1990-05-12');
  }
  await page.getByRole('button', { name: 'Choose your seats →' }).click();
  await page.getByRole('button', { name: 'Help me choose ↗' }).click();
  await expect(page.getByText('OPTION 01', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Reserve this plan', exact: true })
    .first()
    .click();
  await expect(page.getByText(/Held \d+:\d+/)).toHaveCount(2);
  await expect(
    page.getByRole('button', { name: 'Continue to extras →' }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Close planner −' }).click();
  await expect(page.locator('canvas')).toBeVisible();
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
    path: 'test-results/pages-demo-cabin.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Continue to extras →' }).click();
  await page.getByLabel('Extra baggage').first().selectOption('BAG_10');
  await page.getByLabel('Payment result').selectOption('DECLINE');
  await page.getByRole('button', { name: /Confirm & pay/ }).click();
  await expect(page.getByRole('alert')).toContainText('declined');
  await page.getByLabel('Payment result').selectOption('APPROVE');
  await page.getByRole('button', { name: /Confirm & pay/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Your journey is booked.' }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: 'View booking & download e-ticket →' })
    .click();
  await expect(page.getByText('Alex Example', { exact: true })).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download e-ticket ↓' }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(
    /^ticket-DM.*\.pdf$/,
  );
  await page.reload();
  await expect(page.getByText('Sign in to see your bookings.')).toBeVisible();
  await page
    .getByRole('link', { name: 'Enter demo ↗', exact: true })
    .first()
    .click();
  await page.getByRole('button', { name: 'Start demo →' }).click();
  await page.getByRole('link', { name: 'My bookings', exact: true }).click();
  await expect(page.getByText('Alex Example', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Cancel booking', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Yes, cancel booking', exact: true })
    .click();
  await expect(page.getByText('CANCELLED', { exact: true })).toBeVisible();
  expect(apiRequests).toEqual([]);
});
test('mobile landing, deep links and admin demo work on a static host', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /Go beyond/ })).toBeVisible();
  await page
    .getByRole('link', { name: 'Enter demo ↗', exact: true })
    .first()
    .click();
  await page
    .getByRole('combobox', { name: /Explore as/ })
    .selectOption('ADMIN');
  await page.getByRole('button', { name: 'Start demo →' }).click();
  await expect(
    page.getByRole('heading', { name: 'Flight control' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Find flights', exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'Choose flight →' }).first(),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('link', { name: 'Choose flight →' }).first(),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
  await page.getByRole('button', { name: 'Yes, reset', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Go beyond/ })).toBeVisible();
  await page.screenshot({
    path: 'test-results/pages-demo-mobile.png',
    fullPage: true,
  });
});
