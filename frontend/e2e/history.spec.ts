import { test, expect } from "@playwright/test";

test.describe("Meeting Library & Action Tracker E2E", () => {
  test("loads library and switches between Meetings and Action Tracker tabs", async ({ page }) => {
    await page.goto("/dashboard/history");

    // Check main page header
    const mainHeading = page.locator("main").getByRole("heading", { name: "Meeting Library" });
    await expect(mainHeading).toBeVisible();

    // Verify Tab switcher
    const actionTab = page.getByRole("button", { name: /Action Tracker/i });
    await expect(actionTab).toBeVisible();
    await actionTab.click();

    // Verify Action items view is shown
    await expect(page.getByText("Action Items & Deliverables")).toBeVisible();

    // Verify zero Jira mentions
    const text = await page.innerText("body");
    expect(text.toLowerCase()).not.toContain("jira");
  });
});
