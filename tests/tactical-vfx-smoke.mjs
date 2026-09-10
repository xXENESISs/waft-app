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

async function startBattle(playerId, enemyId) {
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

  assert.ok(options.includes(playerId), `Tactical VFX smoke requires ${playerId}`);
  assert.ok(options.includes(enemyId), `Tactical VFX smoke requires ${enemyId}`);

  await page.selectOption("#playerFighter", playerId);
  await page.selectOption("#enemyFighter", enemyId);
  await page.click("#startBattleBtn");
  await page.waitForSelector("#playerImageWrap", { state: "visible", timeout: 10000 });
  await page.waitForSelector("#enemyImageWrap", { state: "visible", timeout: 10000 });

  await page.evaluate(({ playerId, enemyId }) => {
    window.__waftTacticalPlayerId = playerId;
    window.__waftTacticalEnemyId = enemyId;
  }, { playerId, enemyId });
}

async function playTacticalSpecial(specialName, actorId, targetId) {
  await page.evaluate(async ({ specialName, actorId, targetId }) => {
    const module = await import("/js/battle-vfx-signatures-tactical.js");
    window.__waftTacticalProbe = module.playTacticalSignatureVfx(
      {
        type: "special",
        specialName,
        actorId,
        targetId
      },
      {
        playerId: window.__waftTacticalPlayerId,
        enemyId: window.__waftTacticalEnemyId
      }
    );
  }, { specialName, actorId, targetId });
}

async function finishEffect(selector) {
  await page.evaluate(() => window.__waftTacticalProbe);
  await page.waitForSelector(selector, { state: "detached", timeout: 5000 });
}

try {
  // Japanese fire-bellied newt demonstrates the toxin injection; Honey Badger
  // demonstrates Mutilation when roles reverse.
  await startBattle("japanese-fire-bellied-newt", "honey-badger");

  await playTacticalSpecial(
    "Neurotoxic Injection (Tetrodotoxin)",
    "japanese-fire-bellied-newt",
    "honey-badger"
  );
  await page.waitForSelector("#enemyImageWrap .waft-tactical-vfx-local.neurotoxic-injection", { timeout: 5000 });
  assert.equal(await page.locator("#playerImageWrap .waft-tactical-vfx-local.neurotoxic-injection").count(), 0);
  assert.equal(await page.locator("#enemyImageWrap .waft-tactical-needle").count(), 1);
  assert.equal(await page.locator("#enemyImageWrap .waft-tactical-toxin-ring").count(), 1);
  assert.equal(await page.locator("#enemyImageWrap .waft-tactical-toxin-particle").count(), 10);
  await page.waitForTimeout(310);
  await page.screenshot({
    path: `${artifactDir}/turn-summary-v2-neurotoxic-injection-vfx.png`,
    fullPage: true
  });
  await finishEffect(".waft-tactical-vfx-local.neurotoxic-injection");

  await playTacticalSpecial("Mutilation", "honey-badger", "japanese-fire-bellied-newt");
  await page.waitForSelector("#playerImageWrap .waft-tactical-vfx-local.mutilation", { timeout: 5000 });
  assert.equal(await page.locator("#enemyImageWrap .waft-tactical-vfx-local.mutilation").count(), 0);
  assert.equal(await page.locator("#playerImageWrap .waft-tactical-mutilation-slash").count(), 3);
  assert.equal(await page.locator("#playerImageWrap .waft-tactical-lock").count(), 1);
  await page.waitForTimeout(330);
  await page.screenshot({
    path: `${artifactDir}/turn-summary-v2-mutilation-vfx.png`,
    fullPage: true
  });
  await finishEffect(".waft-tactical-vfx-local.mutilation");

  // Coconut Octopus demonstrates the eight-arm sequence; Matamata then closes
  // into Ancestral Retreat on its own side.
  await startBattle("coconut-octopus", "matamata");

  await playTacticalSpecial("Tentacle Storm", "coconut-octopus", "matamata");
  await page.waitForSelector("#enemyImageWrap .waft-tactical-vfx-local.tentacle-storm", { timeout: 5000 });
  assert.equal(await page.locator("#playerImageWrap .waft-tactical-vfx-local.tentacle-storm").count(), 0);
  assert.equal(await page.locator("#enemyImageWrap .waft-tactical-tentacle").count(), 8);
  await page.waitForTimeout(350);
  await page.screenshot({
    path: `${artifactDir}/turn-summary-v2-tentacle-storm-vfx.png`,
    fullPage: true
  });
  await finishEffect(".waft-tactical-vfx-local.tentacle-storm");

  await playTacticalSpecial("Ancestral Retreat", "matamata", "coconut-octopus");
  await page.waitForSelector("#enemyImageWrap .waft-tactical-vfx-local.ancestral-retreat", { timeout: 5000 });
  assert.equal(await page.locator("#playerImageWrap .waft-tactical-vfx-local.ancestral-retreat").count(), 0);
  assert.equal(await page.locator("#enemyImageWrap .waft-tactical-shell").count(), 1);
  assert.equal(await page.locator("#enemyImageWrap .waft-tactical-retreat-ring").count(), 3);
  assert.equal(await page.locator("#enemyImageWrap .waft-tactical-reflect-chevron").count(), 1);
  await page.waitForTimeout(340);
  await page.screenshot({
    path: `${artifactDir}/turn-summary-v2-ancestral-retreat-vfx.png`,
    fullPage: true
  });
  await finishEffect(".waft-tactical-vfx-local.ancestral-retreat");

  assert.deepEqual(pageErrors, [], `Tactical VFX page errors:\n${pageErrors.join("\n\n")}`);
  console.log("WAFT tactical VFX smoke passed on Newt/Honey Badger + Coconut Octopus/Matamata");
} finally {
  await page.close();
  await browser.close();
}
