import { test, expect } from "@playwright/test";

test.describe("Landing Page E2E", () => {
  test("loads landing page and verifies zero Jira references", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/SummAI/);
    
    // Check main headline is present
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();

    // Verify zero Jira mentions in rendered DOM
    const bodyText = await page.innerText("body");
    expect(bodyText.toLowerCase()).not.toContain("jira");

    // Click Launch Studio / Get Started CTA
    const launchBtn = page.getByRole("link", { name: /Launch Studio|Get Started|Start/i }).first();
    if (await launchBtn.isVisible()) {
      await launchBtn.click();
      await expect(page).toHaveURL(/.*dashboard.*/);
    }
  });
});
