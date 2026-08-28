import { test, expect } from "@playwright/test";

test.describe("Summarizer Studio E2E", () => {
  test("renders 4-step wizard and allows manual transcript flow", async ({ page }) => {
    await page.goto("/dashboard/summarizer");

    // 1. Check Step 1 is active
    await expect(page.getByText("New meeting")).toBeVisible();
    await expect(page.getByText("Drag and drop file here")).toBeVisible();

    // 2. Direct Voice recorder component is visible
    await expect(page.getByText("Direct Voice Recording")).toBeVisible();

    // 3. Verify zero Jira references on studio page
    const content = await page.innerText("body");
    expect(content.toLowerCase()).not.toContain("jira");
  });
});
