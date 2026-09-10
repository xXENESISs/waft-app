import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";

const BASE_URL = process.env.WAFT_BASE_URL || "http://127.0.0.1:3000";
const artifactDir = "artifacts";
const screenshotPath = `${artifactDir}/turn-summary-v2-online-battle.png`;

await fs.mkdir(artifactDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context1 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const context2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page1 = await context1.newPage();
const page2 = await context2.newPage();

const pageErrors = [];
const dialogs1 = [];
const dialogs2 = [];

for (const [page, dialogs, label] of [
  [page1, dialogs1, "P1"],
  [page2, dialogs2, "P2"]
]) {
  page.on("pageerror", (error) => {
    pageErrors.push(`${label}: ${error?.stack || error?.message || String(error)}`);
  });

  page.on("dialog", async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.accept();
  });
}

async function waitForFighters(page) {
  await page.waitForFunction(
    () => document.querySelectorAll("#playerFighter option").length > 1,
    undefined,
    { timeout: 15000 }
  );
}

async function getFighterIds(page) {
  return page.locator("#playerFighter option").evaluateAll((options) =>
    options.map((option) => option.value).filter(Boolean)
  );
}

try {
  await Promise.all([
    page1.goto(`${BASE_URL}/online.html`, { waitUntil: "networkidle", timeout: 30000 }),
    page2.goto(`${BASE_URL}/online.html`, { waitUntil: "networkidle", timeout: 30000 })
  ]);

  await Promise.all([waitForFighters(page1), waitForFighters(page2)]);
  await Promise.all([
    page1.waitForFunction(() => typeof window.createRoom === "function", undefined, { timeout: 10000 }),
    page2.waitForFunction(() => typeof window.joinRoom === "function", undefined, { timeout: 10000 })
  ]);

  await page1.evaluate(() => window.createRoom());

  await page1.waitForFunction(
    () => document.getElementById("turnSummaryV2Host")?.textContent?.includes("Room created"),
    undefined,
    { timeout: 10000 }
  );

  const roomDialog = dialogs1.find((message) => /Sala creada:\s*WAFT-\d+/i.test(message));
  assert.ok(roomDialog, `Host should receive the created room code. Dialogs: ${JSON.stringify(dialogs1)}`);

  const roomCode = roomDialog.match(/WAFT-\d+/i)?.[0]?.toUpperCase();
  assert.ok(roomCode, "Could not parse Online Battle room code");

  await page2.fill("#roomInput", roomCode);
  await page2.evaluate(() => window.joinRoom());

  await page2.waitForFunction(
    () => document.getElementById("turnSummaryV2Host")?.textContent?.includes("Both players connected") ||
          document.getElementById("turnSummaryV2Host")?.textContent?.includes("Joined room"),
    undefined,
    { timeout: 10000 }
  );

  const ids1 = await getFighterIds(page1);
  const ids2 = await getFighterIds(page2);
  const fighter1 = ids1[0];
  const fighter2 = ids2.find((id) => id !== fighter1) || ids2[1];

  assert.ok(fighter1 && fighter2 && fighter1 !== fighter2, "Online smoke needs two different fighters");

  await page1.selectOption("#playerFighter", fighter1);
  await page2.selectOption("#playerFighter", fighter2);

  await Promise.all([
    page1.click("#startBattleBtn"),
    page2.click("#startBattleBtn")
  ]);

  await Promise.all([
    page1.waitForFunction(
      () => document.getElementById("turnSummaryV2Host")?.textContent?.includes("Multiplayer battle started"),
      undefined,
      { timeout: 15000 }
    ),
    page2.waitForFunction(
      () => document.getElementById("turnSummaryV2Host")?.textContent?.includes("Multiplayer battle started"),
      undefined,
      { timeout: 15000 }
    )
  ]);

  const normal1 = page1.locator('.action-btn[data-action="normal"]');
  const normal2 = page2.locator('.action-btn[data-action="normal"]');
  await Promise.all([
    normal1.waitFor({ state: "visible", timeout: 10000 }),
    normal2.waitFor({ state: "visible", timeout: 10000 })
  ]);

  assert.equal(await normal1.isEnabled(), true, "P1 Normal Attack should be enabled");
  assert.equal(await normal2.isEnabled(), true, "P2 Normal Attack should be enabled");

  await Promise.all([normal1.click(), normal2.click()]);

  const resolvedPredicate = () => {
    const host = document.getElementById("turnSummaryV2Host");
    if (!host) return false;
    const round = host.querySelector(".waft-turn-v2-round")?.textContent || "";
    const active = host.querySelector(".waft-turn-v2-phase.active-phase");
    const actionPhases = host.querySelectorAll('[data-turn-phase="action"]').length;
    return /ROUND\s+1/i.test(round) && !active && actionPhases >= 1;
  };

  await Promise.all([
    page1.waitForFunction(resolvedPredicate, undefined, { timeout: 25000 }),
    page2.waitForFunction(resolvedPredicate, undefined, { timeout: 25000 })
  ]);

  const summary1 = (await page1.locator("#turnSummaryV2Host").innerText()).replace(/\s+/g, " ").trim();
  const summary2 = (await page2.locator("#turnSummaryV2Host").innerText()).replace(/\s+/g, " ").trim();

  assert.ok(/ROUND\s+1/i.test(summary1));
  assert.ok(/ROUND\s+1/i.test(summary2));
  assert.ok(!/Damage calc|Critical calc|→ HP:/i.test(summary1));
  assert.ok(!/Damage calc|Critical calc|→ HP:/i.test(summary2));

  // Both clients receive the same authoritative order/result. Their left/right
  // fighter orientation differs, but the shared round text itself must match.
  assert.equal(summary1, summary2, `Online clients disagree on resolved round:\nP1: ${summary1}\nP2: ${summary2}`);

  const legacyDisplay1 = await page1.locator("#turnSummaryBox").evaluate((el) => getComputedStyle(el).display);
  const legacyDisplay2 = await page2.locator("#turnSummaryBox").evaluate((el) => getComputedStyle(el).display);
  assert.equal(legacyDisplay1, "none");
  assert.equal(legacyDisplay2, "none");

  const collapsedLogs1 = await page1.locator(".log-panel.waft-v2-log-collapsed").count();
  const collapsedLogs2 = await page2.locator(".log-panel.waft-v2-log-collapsed").count();
  assert.ok(collapsedLogs1 >= 1, "P1 technical Battle Log should start collapsed");
  assert.ok(collapsedLogs2 >= 1, "P2 technical Battle Log should start collapsed");

  await page1.locator(".combat-shell").screenshot({ path: screenshotPath });
  assert.deepEqual(pageErrors, [], `Online Battle browser errors:\n${pageErrors.join("\n\n")}`);

  console.log(`WAFT Online Battle V2 smoke passed in room ${roomCode}: ${fighter1} vs ${fighter2}`);
} catch (error) {
  await page1.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
  throw error;
} finally {
  await Promise.all([context1.close(), context2.close()]);
  await browser.close();
}
