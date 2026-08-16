/**
 * Owner-only reset for Happiness connected walks.
 * Deletes only the signed-in test member's Happiness / Work Fulfillment records
 * via the existing Privacy control. Does not touch other members.
 */
export async function resetOwnHappinessRecords(page, baseUrl) {
  page.once('dialog', (dialog) => {
    void dialog.accept();
  });
  await page.goto(`${baseUrl}/happiness/privacy`, { waitUntil: 'networkidle', timeout: 60000 });
  const erase = page.getByRole('button', { name: 'Delete my Happiness data' });
  await erase.waitFor({ state: 'visible', timeout: 20000 });
  await erase.click();
  await page.getByText('Happiness data deleted.').waitFor({ state: 'visible', timeout: 20000 });
}
