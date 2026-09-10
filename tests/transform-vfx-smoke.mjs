import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";

const BASE_URL = process.env.WAFT_BASE_URL || "http://127.0.0.1:3000";
const artifactDir = "artifacts";

await fs.mkdir(artifactDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const pageErrors = [];

page.on("pageerror", (error) => {
  pageErrors.push(error?.stack || error?.message || String(error));
});

async function startBattle() {
  await page.goto(`${BASE_URL}/test.html`, {
    waitUntil: "networkidle",
    timeout: 30000
  });

  await page.waitForFunction(
    () => document.querySelectorAll("#playerFighter option").length >= 2,
    undefined,
    { timeout: 15000 }
  );

  const options = await page.locator("#playerFighter option").evaluateAll((items) =>
    items.map((option) => option.value).filter(Boolean)
  );

  assert.ok(options.includes("iberian-skink"), "Transform smoke requires Iberian Skink");
  assert.ok(options.includes("pufferfish"), "Transform smoke requires Pufferfish");

  const playerId = "iberian-skink";
  const enemyId = "pufferfish";

  await page.selectOption("#playerFighter", playerId);
  await page.selectOption("#enemyFighter", enemyId);
  await page.click("#startBattleBtn");
  await page.waitForSelector("#playerImageWrap", { state: "visible", timeout: 10000 });
  await page.waitForSelector("#enemyImageWrap", { state: "visible", timeout: 10000 });

  return { playerId, enemyId };
}

async function playTransformSpecial(specialName, actorId, targetId) {
  await page.evaluate(async ({ specialName, actorId, targetId }) => {
    const module = await import("/js/battle-vfx-signatures-transform.js");
    window.__waftTransformProbe = module.playTransformSignatureVfx(
      {
        type: "special",
        specialName,
        actorId,
        targetId
      },
      {
        playerId: window.__waftTransformPlayerId,
        enemyId: window.__waftTransformEnemyId
      }
    );
  }, { specialName, actorId, targetId });
}

try {
  const { playerId, enemyId } = await startBattle();
  await page.evaluate(({ playerId, enemyId }) => {
    window.__waftTransformPlayerId = playerId;
    window.__waftTransformEnemyId = enemyId;
  }, { playerId, enemyId });

  await playTransformSpecial("Caudal Autotomy", playerId, enemyId);
  await page.waitForSelector("#playerImageWrap .waft-transform-vfx-local.caudal-autotomy", { timeout: 5000 });

  assert.equal(
    await page.locator("#enemyImageWrap .waft-transform-vfx-local.caudal-autotomy").count(),
    0,
    "Caudal Autotomy must render on its user, not the opponent"
  );
  assert.equal(
    await page.locator("#playerImageWrap .waft-transform-tail").count(),
    1,
    "Caudal Autotomy should visibly detach a tail"
  );
  assert.equal(
    await page.locator("#playerImageWrap .waft-transform-sever-flash").count(),
    1,
    "Caudal Autotomy should mark the sever point"
  );

  await page.waitForTimeout(280);
  await page.screenshot({
    path: `${artifactDir}/turn-summary-v2-caudal-autotomy-vfx.png`,
    fullPage: true
  });

  await page.evaluate(() => window.__waftTransformProbe);
  await page.waitForSelector(".waft-transform-vfx-local.caudal-autotomy", { state: "detached", timeout: 5000 });

  await playTransformSpecial("Overinflation", enemyId, playerId);
  await page.waitForSelector("#enemyImageWrap .waft-transform-vfx-local.overinflation", { timeout: 5000 });

  assert.equal(
    await page.locator("#playerImageWrap .waft-transform-vfx-local.overinflation").count(),
    0,
    "Overinflation must render on its user"
  );
  assert.equal(
    await page.locator("#enemyImageWrap .waft-transform-inflation-ring").count(),
    1,
    "Overinflation should create a visible inflation ring"
  );
  assert.equal(
    await page.locator("#enemyImageWrap .waft-transform-spike").count(),
    12,
    "Overinflation should expose a radial set of spines"
  );

  await page.waitForTimeout(330);
  await page.screenshot({
    path: `${artifactDir}/turn-summary-v2-overinflation-vfx.png`,
    fullPage: true
  });

  await page.evaluate(() => window.__waftTransformProbe);
  await page.waitForSelector(".waft-transform-vfx-local.overinflation", { state: "detached", timeout: 5000 });

  assert.deepEqual(pageErrors, [], `Transform VFX page errors:\n${pageErrors.join("\n\n")}`);
  console.log("WAFT transform signature VFX smoke passed on Iberian Skink + Pufferfish");
} finally {
  await page.close();
  await browser.close();
}
