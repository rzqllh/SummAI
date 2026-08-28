import { test, expect } from "@playwright/test";

test.describe("Public Shared Meeting E2E", () => {
  test("loads share page and verifies zero Jira references", async ({ page }) => {
    await page.goto("/share?token=test_dummy_token");

    // Verify page content loads without crashing
    const body = page.locator("body");
    await expect(body).toBeVisible();

    // Verify zero Jira mentions
    const text = await page.innerText("body");
    expect(text.toLowerCase()).not.toContain("jira");
  });
});
