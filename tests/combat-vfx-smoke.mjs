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

  const playerId = options[0];
  const enemyId = options.find((id) => id !== playerId) || options[1];

  await page.selectOption("#playerFighter", playerId);
  await page.selectOption("#enemyFighter", enemyId);
  await page.click("#startBattleBtn");
  await page.waitForSelector("#playerImageWrap", { state: "visible", timeout: 10000 });
  await page.waitForSelector("#enemyImageWrap", { state: "visible", timeout: 10000 });

  await page.evaluate(({ playerId, enemyId }) => {
    window.__waftCombatPlayerId = playerId;
    window.__waftCombatEnemyId = enemyId;
  }, { playerId, enemyId });

  return { playerId, enemyId };
}

async function playCombatSpecial(specialName, actorId, targetId) {
  await page.evaluate(async ({ specialName, actorId, targetId }) => {
    const module = await import("/js/battle-vfx-signatures-combat.js");
    window.__waftCombatProbe = module.playCombatSignatureVfx(
      {
        type: "special",
        specialName,
        actorId,
        targetId
      },
      {
        playerId: window.__waftCombatPlayerId,
        enemyId: window.__waftCombatEnemyId
      }
    );
  }, { specialName, actorId, targetId });
}

try {
  const { playerId, enemyId } = await startBattle();

  await playCombatSpecial("Raptorial Chain", playerId, enemyId);
  await page.waitForSelector("#enemyImageWrap .waft-combat-vfx-local.raptorial-chain", { timeout: 5000 });

  assert.equal(
    await page.locator("#playerImageWrap .waft-combat-vfx-local.raptorial-chain").count(),
    0,
    "Raptorial Chain must render its strike sequence on the target"
  );
  assert.equal(
    await page.locator("#enemyImageWrap .waft-combat-raptorial-slash").count(),
    5,
    "Raptorial Chain should communicate its five-strike maximum"
  );

  await page.screenshot({
    path: `${artifactDir}/turn-summary-v2-raptorial-chain-vfx.png`,
    fullPage: true
  });

  await page.evaluate(() => window.__waftCombatProbe);
  await page.waitForSelector(".waft-combat-vfx-local.raptorial-chain", { state: "detached", timeout: 5000 });

  await playCombatSpecial("Anubis' Staff", playerId, enemyId);
  await page.waitForSelector("#playerImageWrap .waft-combat-vfx-local.anubis-staff.actor", { timeout: 5000 });
  await page.waitForSelector("#enemyImageWrap .waft-combat-vfx-local.anubis-staff.target", { timeout: 5000 });

  assert.equal(
    await page.locator("#enemyImageWrap .waft-combat-staff").count(),
    1,
    "Anubis' Staff should strike the target"
  );
  assert.equal(
    await page.locator("#enemyImageWrap .waft-combat-drain-orb").count(),
    8,
    "Anubis' Staff should visibly drain resources from the target"
  );
  assert.equal(
    await page.locator("#playerImageWrap .waft-combat-impact-ring").count(),
    1,
    "Anubis' Staff should return a benefit pulse to its user"
  );

  await page.evaluate(() => window.__waftCombatProbe);
  await page.waitForSelector(".waft-combat-vfx-local.anubis-staff", { state: "detached", timeout: 5000 });

  assert.deepEqual(pageErrors, [], `Combat VFX page errors:\n${pageErrors.join("\n\n")}`);
  console.log("WAFT combat signature VFX smoke passed: Raptorial Chain + Anubis' Staff");
} finally {
  await page.close();
  await browser.close();
}
