import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";

const PUBLIC_BASE_URL = String(process.env.WAFT_PUBLIC_PREVIEW_URL || "").replace(/\/$/, "");
if (!PUBLIC_BASE_URL) {
  console.log("WAFT_PUBLIC_PREVIEW_URL not provided; public preview smoke skipped.");
  process.exit(0);
}

const artifactDir = "artifacts";
await fs.mkdir(artifactDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 915, height: 412 } });
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error?.stack || error?.message || String(error)));

try {
  await page.goto(`${PUBLIC_BASE_URL}/tournament.html`, { waitUntil: "domcontentloaded", timeout: 45000 });

  // The V2 bootstrap prewarms the roster immediately and then explicitly marks
  // itself ready when the mature tournament module has finished loading.
  await page.waitForFunction(
    () => document.querySelectorAll("#playerFighter option").length >= 16,
    undefined,
    { timeout: 30000 }
  );

  await page.waitForFunction(
    () => document.documentElement.dataset.tournamentBootstrap === "ready",
    undefined,
    { timeout: 30000 }
  );

  const count = await page.locator("#playerFighter option").count();
  assert.ok(count >= 16, `Public preview tournament roster should be selectable; got ${count} options`);
  assert.equal(await page.locator("#startTournamentBtn").isEnabled(), true, "Public preview Start Tournament must be enabled after bootstrap");

  await page.selectOption("#playerFighter", { index: 1 });
  assert.ok(await page.locator("#playerFighter").inputValue(), "Public preview fighter selector should accept a real selection");

  await page.screenshot({ path: `${artifactDir}/public-preview-tournament-selector.png`, fullPage: true });
  assert.deepEqual(pageErrors, [], `Public preview tournament browser errors:\n${pageErrors.join("\n\n")}`);
  console.log(`WAFT public preview tournament selector smoke passed with ${count} fighters.`);
} catch (error) {
  await page.screenshot({ path: `${artifactDir}/public-preview-tournament-selector-failure.png`, fullPage: true }).catch(() => {});
  throw error;
} finally {
  await browser.close();
}
