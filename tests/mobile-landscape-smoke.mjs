import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";

const BASE_URL = process.env.WAFT_BASE_URL || "http://127.0.0.1:3000";
const artifactDir = "artifacts";
await fs.mkdir(artifactDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 915, height: 412 } });
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error?.stack || error?.message || String(error)));

try {
  await page.goto(`${BASE_URL}/test.html`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForFunction(() => document.querySelectorAll("#playerFighter option").length >= 2, undefined, { timeout: 15000 });

  const ids = await page.locator("#playerFighter option").evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
  const playerId = ids.includes("sumatran-tiger") ? "sumatran-tiger" : ids[0];
  const enemyId = ids.includes("walrus") ? "walrus" : ids.find((id) => id !== playerId);

  await page.selectOption("#playerFighter", playerId);
  await page.selectOption("#enemyFighter", enemyId);
  await page.click("#startBattleBtn");
  await page.waitForSelector("#turnSummaryV2Host", { timeout: 10000 });

  const layout = await page.evaluate(() => {
    const rect = (selector) => {
      const box = document.querySelector(selector)?.getBoundingClientRect();
      return box ? { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom } : null;
    };

    return {
      viewportWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      shell: rect(".combat-shell"),
      playerCard: rect(".fighter-card:first-child"),
      enemyCard: rect(".fighter-card:last-child"),
      playerImage: rect("#playerImageWrap"),
      enemyImage: rect("#enemyImageWrap")
    };
  });

  assert.ok(layout.shell && layout.playerCard && layout.enemyCard && layout.playerImage && layout.enemyImage, "Landscape arena geometry should exist");
  assert.ok(layout.scrollWidth <= layout.viewportWidth + 2, `Landscape arena must not overflow horizontally: ${JSON.stringify(layout)}`);

  const playerBottomGap = layout.shell.bottom - layout.playerCard.bottom;
  const enemyBottomGap = layout.shell.bottom - layout.enemyCard.bottom;
  assert.ok(playerBottomGap <= 10, `Player card should use the arena height instead of leaving dead space (${playerBottomGap}px)`);
  assert.ok(enemyBottomGap <= 10, `Enemy card should use the arena height instead of leaving dead space (${enemyBottomGap}px)`);

  const playerImageRatio = layout.playerImage.height / layout.playerImage.width;
  const enemyImageRatio = layout.enemyImage.height / layout.enemyImage.width;
  assert.ok(layout.playerImage.height >= 170 && playerImageRatio >= 1.05, `Player portrait must stay tall enough to avoid the old shallow crop: ${JSON.stringify(layout.playerImage)}`);
  assert.ok(layout.enemyImage.height >= 170 && enemyImageRatio >= 1.05, `Enemy portrait must stay tall enough to avoid the old shallow crop: ${JSON.stringify(layout.enemyImage)}`);

  await page.screenshot({ path: `${artifactDir}/single-battle-mobile-landscape.png`, fullPage: true });
  assert.deepEqual(pageErrors, [], `Landscape browser errors:\n${pageErrors.join("\n\n")}`);
  console.log(`WAFT mobile landscape smoke passed: ${playerId} vs ${enemyId}`);
} catch (error) {
  await page.screenshot({ path: `${artifactDir}/single-battle-mobile-landscape-failure.png`, fullPage: true }).catch(() => {});
  throw error;
} finally {
  await browser.close();
}
