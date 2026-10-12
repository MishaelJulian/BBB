import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const spines = (page: import('@playwright/test').Page) => page.locator('[role="button"][aria-label]')

test('Library Room shows real books and opens one by keyboard', async ({ page, isMobile }) => {
  await page.goto('/library-room')
  await expect(spines(page).first()).toBeVisible({ timeout: 30_000 })
  expect(await spines(page).count()).toBeGreaterThan(10)
  if (!isMobile) {
    const first = spines(page).first()
    await first.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  }
})

test('a failed archive load shows a message and a retry button', async ({ page }) => {
  await page.route('**/api/books**', (route) => route.fulfill({ status: 500, body: '{}' }))
  await page.goto('/library-room')
  await expect(page.getByRole('alert').filter({ hasText: 'could not be loaded' })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
})

test('book detail page loads a real record', async ({ page, request }) => {
  const books = await (await request.get('/api/books?limit=1')).json()
  await page.goto(`/books/${books[0].id}`)
  await expect(page.getByText(books[0].title).first()).toBeVisible({ timeout: 30_000 })
})

test('admin needs a login', async ({ page, request }) => {
  expect((await request.get('/api/admin/meetups')).status()).toBe(401)
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin|\/login\?next=\/admin/, { timeout: 30_000 })
  await expect(page.getByLabel('Email')).toBeVisible()
})

test('admin can sign in and sign out', async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL
  const password = process.env.E2E_ADMIN_PASSWORD
  test.skip(!email || !password, 'set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run')
  await page.goto('/login?next=/admin')
  await page.getByLabel('Email').fill(email!)
  await page.getByLabel('Password').fill(password!)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/admin$/, { timeout: 30_000 })
  await expect(page.getByText('Checking sign-in')).toBeHidden({ timeout: 30_000 })
  await page.goto('/account')
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/$/)
})

// Launch scope (founders, 2026-10-09): names, labels and keyboard; colour contrast comes after launch.
for (const path of ['/', '/library-room', '/privacy', '/login']) {
  test(`no serious accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .disableRules(['color-contrast'])
      .analyze()
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(serious.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([])
  })
}
