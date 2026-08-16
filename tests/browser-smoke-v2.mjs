import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";

const BASE_URL = process.env.WAFT_BASE_URL || "http://127.0.0.1:3000";
const artifactDir = "artifacts";

await fs.mkdir(artifactDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function runSingleBattleSmoke({ label, viewport, screenshotPath, checkHorizontalOverflow = false }) {
  const page = await browser.newPage({ viewport });
  const pageErrors = [];

  page.on("pageerror", (error) => {
    pageErrors.push(error?.stack || error?.message || String(error));
  });

  try {
    await page.goto(`${BASE_URL}/test.html`, {
      waitUntil: "networkidle",
      timeout: 30000
    });

    await page.waitForFunction(
      () => document.querySelectorAll("#playerFighter option").length > 0,
      undefined,
      { timeout: 15000 }
    );
    await page.waitForFunction(
      () => document.querySelectorAll("#enemyFighter option").length > 0,
      undefined,
      { timeout: 15000 }
    );

    const playerOptions = await page.locator("#playerFighter option").evaluateAll((options) =>
      options.map((option) => option.value).filter(Boolean)
    );
    const enemyOptions = await page.locator("#enemyFighter option").evaluateAll((options) =>
      options.map((option) => option.value).filter(Boolean)
    );

    assert.ok(playerOptions.length >= 2, "Single Battle needs at least two selectable fighters");

    const playerId = playerOptions[0];
    const enemyId = enemyOptions.find((id) => id !== playerId) || playerOptions[1];

    await page.selectOption("#playerFighter", playerId);
    await page.selectOption("#enemyFighter", enemyId);
    await page.click("#startBattleBtn");

    await page.waitForSelector("#turnSummaryV2Host", { timeout: 10000 });
    await page.waitForSelector("#waftBattleFieldHud", { timeout: 10000 });

    const legacyDisplay = await page.locator("#turnSummaryBox").evaluate((element) => getComputedStyle(element).display);
    assert.equal(legacyDisplay, "none", "Legacy wall-of-text summary must be hidden under V2");

    const legacyPlayerEffectsDisplay = await page.locator("#playerEffects").evaluate((element) => getComputedStyle(element).display);
    const legacyEnemyEffectsDisplay = await page.locator("#enemyEffects").evaluate((element) => getComputedStyle(element).display);
    assert.equal(legacyPlayerEffectsDisplay, "none", "Legacy player effect list must be hidden under V2");
    assert.equal(legacyEnemyEffectsDisplay, "none", "Legacy enemy effect list must be hidden under V2");

    const fieldChipCount = await page.locator("#waftBattleFieldHud .waft-field-chip").count();
    assert.ok(fieldChipCount >= 3, "Battlefield HUD should show biome, modified stat and day/night");

    const normalAction = page.locator('.action-btn[data-action="normal"]');
    await normalAction.waitFor({ state: "visible", timeout: 10000 });
    assert.equal(await normalAction.isEnabled(), true, "Normal Attack should be available in the smoke battle");

    await normalAction.click();

    await page.waitForFunction(
      () => {
        const host = document.getElementById("turnSummaryV2Host");
        const round = host?.querySelector(".waft-turn-v2-round")?.textContent || "";
        const phases = host?.querySelectorAll(".waft-turn-v2-phase").length || 0;
        return /ROUND\s+1/i.test(round) && phases >= 1;
      },
      undefined,
      { timeout: 15000 }
    );

    await page.waitForFunction(
      () => {
        const host = document.getElementById("turnSummaryV2Host");
        if (!host) return false;
        const active = host.querySelector(".waft-turn-v2-phase.active-phase");
        const actionPhases = host.querySelectorAll('[data-turn-phase="action"]').length;
        return !active && actionPhases >= 1;
      },
      undefined,
      { timeout: 20000 }
    );

    const orderPills = await page.locator("#turnSummaryV2Host .waft-turn-v2-order span").count();
    assert.equal(orderPills, 2, "Resolved round should display both action-order entries");

    const actionPhases = await page.locator('#turnSummaryV2Host [data-turn-phase="action"]').count();
    assert.ok(actionPhases >= 1, "Resolved round should expose at least one action phase");

    const summaryText = await page.locator("#turnSummaryV2Host").innerText();
    assert.ok(/ROUND\s+1/i.test(summaryText), "V2 summary should identify Round 1");
    assert.ok(!/Damage calc|Critical calc|→ HP:/i.test(summaryText), "Technical engine lines must not leak into the player summary");
    assert.ok(!/gains effect:/i.test(summaryText), "Legacy effect sentences must not leak into the compact summary");

    if (checkHorizontalOverflow) {
      const layout = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        bodyScrollWidth: document.body.scrollWidth
      }));

      assert.ok(
        layout.scrollWidth <= layout.clientWidth + 2 && layout.bodyScrollWidth <= layout.clientWidth + 2,
        `Mobile layout overflows horizontally: ${JSON.stringify(layout)}`
      );

      const summaryBounds = await page.locator("#turnSummaryV2Host").boundingBox();
      assert.ok(summaryBounds && summaryBounds.width <= layout.clientWidth + 2, "Turn Summary V2 must fit the mobile viewport");
    }

    const screenshotTarget = label === "mobile"
      ? page.locator("body")
      : page.locator(".combat-shell");

    await screenshotTarget.screenshot({ path: screenshotPath });

    assert.deepEqual(pageErrors, [], `Browser page errors (${label}):\n${pageErrors.join("\n\n")}`);

    console.log(`WAFT V2 ${label} smoke passed: ${playerId} vs ${enemyId}`);
  } catch (error) {
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    throw error;
  } finally {
    await page.close();
  }
}

try {
  await runSingleBattleSmoke({
    label: "desktop",
    viewport: { width: 1440, height: 1000 },
    screenshotPath: `${artifactDir}/turn-summary-v2-single-battle.png`
  });

  await runSingleBattleSmoke({
    label: "mobile",
    viewport: { width: 390, height: 844 },
    screenshotPath: `${artifactDir}/turn-summary-v2-mobile.png`,
    checkHorizontalOverflow: true
  });
} finally {
  await browser.close();
}
