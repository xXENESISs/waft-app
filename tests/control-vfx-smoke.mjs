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

  assert.ok(options.includes("emerald-wasp"), "Control VFX smoke requires Emerald Wasp");
  assert.ok(options.includes("iguana"), "Control VFX smoke requires Iguana");

  const playerId = "emerald-wasp";
  const enemyId = "iguana";

  await page.selectOption("#playerFighter", playerId);
  await page.selectOption("#enemyFighter", enemyId);
  await page.click("#startBattleBtn");
  await page.waitForSelector("#playerImageWrap", { state: "visible", timeout: 10000 });
  await page.waitForSelector("#enemyImageWrap", { state: "visible", timeout: 10000 });

  await page.evaluate(({ playerId, enemyId }) => {
    window.__waftControlPlayerId = playerId;
    window.__waftControlEnemyId = enemyId;
  }, { playerId, enemyId });

  return { playerId, enemyId };
}

async function playControlSpecial(specialName, actorId, targetId) {
  await page.evaluate(async ({ specialName, actorId, targetId }) => {
    const module = await import("/js/battle-vfx-signatures-control.js");
    window.__waftControlProbe = module.playControlSignatureVfx(
      {
        type: "special",
        specialName,
        actorId,
        targetId
      },
      {
        playerId: window.__waftControlPlayerId,
        enemyId: window.__waftControlEnemyId
      }
    );
  }, { specialName, actorId, targetId });
}

try {
  const { playerId, enemyId } = await startBattle();

  await playControlSpecial("Zombie Cockroach", playerId, enemyId);
  await page.waitForSelector("#enemyImageWrap .waft-control-vfx-local.zombie-cockroach", { timeout: 5000 });

  assert.equal(
    await page.locator("#playerImageWrap .waft-control-vfx-local.zombie-cockroach").count(),
    0,
    "Zombie Cockroach must attach to the target, not its user"
  );
  assert.equal(
    await page.locator("#enemyImageWrap .waft-control-cockroach").count(),
    1,
    "Zombie Cockroach should visibly attach one parasite"
  );
  assert.equal(
    await page.locator("#enemyImageWrap .waft-control-drain-thread").count(),
    4,
    "Zombie Cockroach should expose its drain/control threads"
  );

  await page.waitForTimeout(350);
  await page.screenshot({
    path: `${artifactDir}/turn-summary-v2-zombie-cockroach-vfx.png`,
    fullPage: true
  });

  await page.evaluate(() => window.__waftControlProbe);
  await page.waitForSelector(".waft-control-vfx-local.zombie-cockroach", { state: "detached", timeout: 5000 });

  // Reverse roles so the real Iguana demonstrates its own Refresh special.
  await playControlSpecial("Refresh", enemyId, playerId);
  await page.waitForSelector("#enemyImageWrap .waft-control-vfx-local.refresh.actor", { timeout: 5000 });
  await page.waitForSelector("#playerImageWrap .waft-control-vfx-local.refresh.target", { timeout: 5000 });

  assert.equal(
    await page.locator("#enemyImageWrap .waft-control-refresh-ring").count(),
    3,
    "Refresh should show recovery rings on Iguana"
  );
  assert.equal(
    await page.locator("#playerImageWrap .waft-control-debuff-wave").count(),
    3,
    "Refresh should show the Technique/Agility debuff separately on the opponent"
  );

  await page.waitForTimeout(330);
  await page.screenshot({
    path: `${artifactDir}/turn-summary-v2-refresh-vfx.png`,
    fullPage: true
  });

  await page.evaluate(() => window.__waftControlProbe);
  await page.waitForSelector(".waft-control-vfx-local.refresh", { state: "detached", timeout: 5000 });

  assert.deepEqual(pageErrors, [], `Control VFX page errors:\n${pageErrors.join("\n\n")}`);
  console.log("WAFT control/resource VFX smoke passed on Emerald Wasp + Iguana");
} finally {
  await page.close();
  await browser.close();
}
