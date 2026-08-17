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
  await page.waitForSelector("#playerImageWrap", { timeout: 10000 });

  await page.evaluate(async () => {
    const module = await import("/js/battle-status-hud.js");
    const fighter = {
      effects: [
        { id: "poison", name: "Poison", duration: 2, modifiers: {} },
        { id: "hunting-inertia", name: "Hunting Inertia", duration: 99, stacks: 3, modifiers: { damagePct: 15 } }
      ]
    };

    module.renderFighterStatusHudInto(fighter, document.getElementById("playerImageWrap"), {
      hudId: "clarityStatusHud"
    });
  });

  const text = await page.locator("#clarityStatusHud").innerText();
  assert.match(text, /POISON/i, "Poison chip should include a readable short name");
  assert.match(text, /2T/i, "Poison chip should expose remaining turns");
  assert.match(text, /INERTIA/i, "Stacking effects should include a readable short name");
  assert.match(text, /×3/i, "Stacking effects should expose stack count");

  const chipCount = await page.locator("#clarityStatusHud .waft-status-chip").count();
  assert.equal(chipCount, 2, "Synthetic status HUD should render two readable chips");

  const layout = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth
  }));

  assert.ok(
    layout.scrollWidth <= layout.clientWidth + 2 && layout.bodyScrollWidth <= layout.clientWidth + 2,
    `Readable status chips must not introduce mobile overflow: ${JSON.stringify(layout)}`
  );

  assert.deepEqual(pageErrors, [], `Browser page errors:\n${pageErrors.join("\n\n")}`);
  console.log("WAFT status HUD clarity smoke passed");
} finally {
  await browser.close();
}
