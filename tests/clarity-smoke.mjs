import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE_URL = process.env.WAFT_BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const pageErrors = [];

page.on("pageerror", (error) => {
  pageErrors.push(error?.stack || error?.message || String(error));
});

try {
  await page.goto(`${BASE_URL}/test.html`, { waitUntil: "networkidle", timeout: 30000 });

  await page.waitForFunction(
    () => document.querySelectorAll("#playerFighter option").length > 1 &&
      document.querySelectorAll("#enemyFighter option").length > 1,
    undefined,
    { timeout: 15000 }
  );

  const fighters = await page.locator("#playerFighter option").evaluateAll((options) =>
    options.map((option) => option.value).filter(Boolean)
  );

  await page.selectOption("#playerFighter", fighters[0]);
  await page.selectOption("#enemyFighter", fighters[1]);
  await page.click("#startBattleBtn");

  const normalAction = page.locator('.action-btn[data-action="normal"]');
  await normalAction.waitFor({ state: "visible", timeout: 10000 });
  await normalAction.click();

  await page.waitForFunction(
    () => {
      const root = document.querySelector("#turnSummaryV2Host .waft-turn-v2.waft-turn-v2-clarified");
      const active = root?.querySelector(".waft-turn-v2-phase.active-phase");
      const actions = root?.querySelectorAll('[data-turn-phase="action"]').length || 0;
      return Boolean(root) && !active && actions >= 1;
    },
    undefined,
    { timeout: 20000 }
  );

  assert.equal(
    await page.locator("#turnSummaryV2Host .waft-turn-v2-order-reason").count(),
    1,
    "Summary should explain why the first fighter moved first"
  );

  const orderMetaCount = await page.locator("#turnSummaryV2Host .waft-turn-v2-order-meta").count();
  assert.ok(orderMetaCount >= 2, "Both order entries should expose priority/speed metadata");

  const phaseMetaCount = await page.locator("#turnSummaryV2Host .waft-turn-v2-phase-meta").count();
  assert.ok(phaseMetaCount >= 1, "Action cards should expose target and order metadata");

  const summaryText = await page.locator("#turnSummaryV2Host").innerText();
  assert.match(summaryText, /FIRST MOVE/i, "Summary should state the first-move reason");
  assert.match(summaryText, /PRI\s+\d+/i, "Summary should show action priority");
  assert.match(summaryText, /SPD\s+\d+/i, "Summary should show effective speed");

  const resultLabels = await page.locator("#turnSummaryV2Host .waft-turn-v2-group-label").allTextContents();
  if (resultLabels.length > 0) {
    assert.ok(resultLabels.some((label) => /RESULT/i.test(label)), "Grouped action events should identify the result section");
  }

  const layout = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth
  }));

  assert.ok(
    layout.scrollWidth <= layout.clientWidth + 2 && layout.bodyScrollWidth <= layout.clientWidth + 2,
    `Clarity layer must not introduce horizontal overflow: ${JSON.stringify(layout)}`
  );

  assert.deepEqual(pageErrors, [], `Browser page errors:\n${pageErrors.join("\n\n")}`);
  console.log("WAFT Turn Summary clarity smoke passed");
} finally {
  await browser.close();
}
