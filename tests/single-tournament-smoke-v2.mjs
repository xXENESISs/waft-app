import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";

const BASE_URL = process.env.WAFT_BASE_URL || "http://127.0.0.1:3000";
const artifactDir = "artifacts";
const screenshotPath = `${artifactDir}/turn-summary-v2-single-tournament.png`;

await fs.mkdir(artifactDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const pageErrors = [];

page.on("pageerror", (error) => {
  pageErrors.push(error?.stack || error?.message || String(error));
});
page.on("dialog", (dialog) => dialog.accept());

try {
  await page.goto(`${BASE_URL}/tournament.html`, {
    waitUntil: "networkidle",
    timeout: 30000
  });

  await page.waitForFunction(
    () => document.querySelectorAll("#playerFighter option").length > 1,
    undefined,
    { timeout: 15000 }
  );

  const fighterIds = await page.locator("#playerFighter option").evaluateAll((options) =>
    options.map((option) => option.value).filter(Boolean)
  );
  assert.ok(fighterIds.length >= 16, "Single Tournament needs enough fighters to build its bracket");

  // Pick a standard fighter from the first entries; the smoke only exercises
  // generic Normal Attack so no special-resource modal is required.
  await page.selectOption("#playerFighter", fighterIds[0]);
  await page.click("#startTournamentBtn");

  await page.waitForFunction(
    () => getComputedStyle(document.getElementById("battlePanel")).display !== "none",
    undefined,
    { timeout: 15000 }
  );

  await page.waitForSelector("#turnSummaryV2Host", { timeout: 10000 });
  await page.waitForSelector("#waftBattleFieldHud", { timeout: 10000 });

  const bracketCards = await page.locator("#bracketGrid .match-card, #bracketGrid [class*='match']").count();
  assert.ok(bracketCards > 0, "Tournament bracket should render after Start Tournament");

  const legacyDisplay = await page.locator("#turnSummaryBox").evaluate((el) => getComputedStyle(el).display);
  assert.equal(legacyDisplay, "none", "Tournament must hide legacy Turn Summary under V2");

  const normal = page.locator('.action-btn[data-action="normal"]');
  await normal.waitFor({ state: "visible", timeout: 10000 });
  assert.equal(await normal.isEnabled(), true, "Tournament Normal Attack should be enabled");
  await normal.click();

  await page.waitForFunction(
    () => {
      const host = document.getElementById("turnSummaryV2Host");
      const round = host?.querySelector(".waft-turn-v2-round")?.textContent || "";
      const active = host?.querySelector(".waft-turn-v2-phase.active-phase");
      const actions = host?.querySelectorAll('[data-turn-phase="action"]').length || 0;
      return /ROUND\s+1/i.test(round) && !active && actions >= 1;
    },
    undefined,
    { timeout: 25000 }
  );

  const summary = await page.locator("#turnSummaryV2Host").innerText();
  assert.ok(/ROUND\s+1/i.test(summary));
  assert.ok(!/Damage calc|Critical calc|→ HP:/i.test(summary));

  const orderCount = await page.locator("#turnSummaryV2Host .waft-turn-v2-order span").count();
  assert.ok(orderCount >= 1 && orderCount <= 2, "Tournament order should reflect only fighters that actually acted");

  const collapsedLogs = await page.locator(".log-panel.waft-v2-log-collapsed").count();
  assert.ok(collapsedLogs >= 1, "Tournament technical Battle Log should start collapsed");

  // Regression for a rare race found in CI: a late legacy Turn Summary mutation
  // must never replace an already-rendered structured V2 round.
  await page.waitForTimeout(950);
  await page.locator("#turnSummaryBox").evaluate((legacy) => {
    legacy.textContent = "Legacy late turn summary must stay hidden.";
  });
  await page.waitForTimeout(120);

  assert.equal(
    await page.locator("#turnSummaryV2Host .waft-turn-v2").count(),
    1,
    "Late legacy summary mutations must not overwrite the structured tournament round"
  );
  assert.ok(
    /ROUND\s+1/i.test(await page.locator("#turnSummaryV2Host").innerText()),
    "Structured tournament round must survive late legacy summary mutations"
  );

  await page.locator("#battlePanel").screenshot({ path: screenshotPath });
  assert.deepEqual(pageErrors, [], `Single Tournament browser errors:\n${pageErrors.join("\n\n")}`);

  console.log(`WAFT Single Tournament V2 smoke passed with ${fighterIds[0]}`);
} catch (error) {
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
  throw error;
} finally {
  await browser.close();
}
