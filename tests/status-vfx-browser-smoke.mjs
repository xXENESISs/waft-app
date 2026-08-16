import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";

const BASE_URL = process.env.WAFT_BASE_URL || "http://127.0.0.1:3000";
const artifactDir = "artifacts";
const screenshotPath = `${artifactDir}/turn-summary-v2-poison-vfx.png`;

await fs.mkdir(artifactDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const pageErrors = [];

page.on("pageerror", (error) => {
  pageErrors.push(error?.stack || error?.message || String(error));
});

try {
  await page.goto(`${BASE_URL}/test.html`, { waitUntil: "networkidle", timeout: 30000 });

  await page.waitForFunction(
    () => document.querySelectorAll("#playerFighter option").length > 1,
    undefined,
    { timeout: 15000 }
  );

  const fighterIds = await page.locator("#playerFighter option").evaluateAll((options) =>
    options.map((option) => option.value).filter(Boolean)
  );

  const playerId = fighterIds[0];
  const enemyId = fighterIds.find((id) => id !== playerId) || fighterIds[1];

  await page.selectOption("#playerFighter", playerId);
  await page.selectOption("#enemyFighter", enemyId);
  await page.click("#startBattleBtn");
  await page.waitForSelector("#enemyImageWrap", { timeout: 10000 });

  await page.evaluate(async ({ playerId, enemyId }) => {
    const module = await import("/js/battle-vfx-statuses.js");
    window.__waftStatusProbe = module.playAppliedStatusVfx(
      {
        type: "status-applied",
        statusName: "Poison",
        actorId: playerId,
        targetId: enemyId
      },
      { playerId, enemyId }
    );
  }, { playerId, enemyId });

  await page.waitForSelector("#enemyImageWrap .waft-status-application.toxin", { timeout: 5000 });
  assert.equal(
    await page.locator("#playerImageWrap .waft-status-application.toxin").count(),
    0,
    "Poison application VFX must not render on its source"
  );
  assert.ok(
    await page.locator("#enemyImageWrap .waft-status-application.toxin .waft-status-bubble").count() >= 6,
    "Poison should create a readable toxic bubble burst"
  );

  await page.locator(".combat-shell").screenshot({ path: screenshotPath });
  await page.evaluate(() => window.__waftStatusProbe);
  await page.waitForSelector("#enemyImageWrap .waft-status-application.toxin", { state: "detached", timeout: 5000 });

  await page.evaluate(async ({ playerId, enemyId }) => {
    const module = await import("/js/battle-vfx-statuses.js");
    window.__waftStatusProbe = module.playAppliedStatusVfx(
      {
        type: "status-applied",
        statusName: "Total Blindness",
        actorId: playerId,
        targetId: enemyId
      },
      { playerId, enemyId }
    );
  }, { playerId, enemyId });

  await page.waitForSelector("#enemyImageWrap .waft-status-application.blindness", { timeout: 5000 });
  assert.equal(
    await page.locator("#playerImageWrap .waft-status-application.blindness").count(),
    0,
    "Blindness application VFX must render only on the affected fighter"
  );
  await page.evaluate(() => window.__waftStatusProbe);
  await page.waitForSelector("#enemyImageWrap .waft-status-application.blindness", { state: "detached", timeout: 5000 });

  assert.deepEqual(pageErrors, [], `Applied status VFX browser errors:\n${pageErrors.join("\n\n")}`);
  console.log(`WAFT status VFX smoke passed: ${playerId} -> ${enemyId}`);
} catch (error) {
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
  throw error;
} finally {
  await browser.close();
}
