import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";

const BASE_URL = process.env.WAFT_BASE_URL || "http://127.0.0.1:3000";
const artifactDir = "artifacts";
const screenshotPath = `${artifactDir}/turn-summary-v2-online-tournament.png`;

await fs.mkdir(artifactDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context1 = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const context2 = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page1 = await context1.newPage();
const page2 = await context2.newPage();
const pageErrors = [];

for (const [page, label] of [[page1, "Host"], [page2, "Guest"]]) {
  page.on("pageerror", (error) => {
    pageErrors.push(`${label}: ${error?.stack || error?.message || String(error)}`);
  });
  page.on("dialog", (dialog) => dialog.accept());
}

async function waitForLobbyReady(page) {
  await page.waitForFunction(
    () => document.getElementById("socketStatusValue")?.textContent === "Connected",
    undefined,
    { timeout: 15000 }
  );
  await page.waitForFunction(
    () => document.querySelectorAll("#playerFighter option").length > 1,
    undefined,
    { timeout: 15000 }
  );
}

async function fighterIds(page) {
  return page.locator("#playerFighter option").evaluateAll((options) =>
    options.map((option) => option.value).filter(Boolean)
  );
}

async function waitForResolvedV2(page) {
  await page.waitForFunction(
    () => {
      const box = document.querySelector('.online-summary-box[data-turn-summary-version="2"]');
      if (!box) return false;
      const round = box.querySelector(".waft-turn-v2-round")?.textContent || "";
      const active = box.querySelector(".waft-turn-v2-phase.active-phase");
      const actions = box.querySelectorAll('[data-turn-phase="action"]').length;
      return /ROUND\s+1/i.test(round) && !active && actions >= 1;
    },
    undefined,
    { timeout: 30000 }
  );
}

try {
  await Promise.all([
    page1.goto(`${BASE_URL}/online-tournament.html`, { waitUntil: "networkidle", timeout: 30000 }),
    page2.goto(`${BASE_URL}/online-tournament.html`, { waitUntil: "networkidle", timeout: 30000 })
  ]);
  await Promise.all([waitForLobbyReady(page1), waitForLobbyReady(page2)]);

  await page1.click("#createTournamentRoomBtn");
  await page1.waitForFunction(
    () => /^WAFT-\d+$/i.test(document.getElementById("roomCodeValue")?.textContent || ""),
    undefined,
    { timeout: 10000 }
  );

  const roomCode = (await page1.locator("#roomCodeValue").innerText()).trim();
  assert.match(roomCode, /^WAFT-\d+$/i);

  await page2.fill("#roomInput", roomCode);
  await page2.click("#joinTournamentRoomBtn");

  await Promise.all([
    page1.waitForFunction(() => document.getElementById("playersCountValue")?.textContent?.startsWith("2/"), undefined, { timeout: 10000 }),
    page2.waitForFunction(() => document.getElementById("playersCountValue")?.textContent?.startsWith("2/"), undefined, { timeout: 10000 })
  ]);

  const ids1 = await fighterIds(page1);
  const ids2 = await fighterIds(page2);
  const fighter1 = ids1[0];
  const fighter2 = ids2.find((id) => id !== fighter1) || ids2[1];
  assert.ok(fighter1 && fighter2 && fighter1 !== fighter2);

  await page1.selectOption("#playerFighter", fighter1);
  await page2.selectOption("#playerFighter", fighter2);

  await Promise.all([
    page1.waitForFunction(() => document.getElementById("fighterStatusValue")?.textContent !== "-", undefined, { timeout: 10000 }),
    page2.waitForFunction(() => document.getElementById("fighterStatusValue")?.textContent !== "-", undefined, { timeout: 10000 })
  ]);

  await Promise.all([page1.click("#readyBtn"), page2.click("#readyBtn")]);

  await Promise.all([
    page1.waitForFunction(() => document.getElementById("readyStatusValue")?.textContent === "Ready", undefined, { timeout: 10000 }),
    page2.waitForFunction(() => document.getElementById("readyStatusValue")?.textContent === "Ready", undefined, { timeout: 10000 })
  ]);

  await page1.waitForFunction(() => !document.getElementById("startTournamentBtn")?.disabled, undefined, { timeout: 10000 });
  await page1.click("#startTournamentBtn");

  await Promise.all([
    page1.waitForFunction(() => document.getElementById("bracketStatus")?.textContent !== "Waiting for bracket", undefined, { timeout: 15000 }),
    page2.waitForFunction(() => document.getElementById("bracketStatus")?.textContent !== "Waiting for bracket", undefined, { timeout: 15000 })
  ]);

  const bracketMatches = await page1.locator("#bracketGrid .bracket-match").count();
  assert.ok(bracketMatches >= 8, "Online Tournament should render the locked bracket");

  await page1.waitForFunction(() => !document.getElementById("nextCombatBtn")?.disabled, undefined, { timeout: 10000 });
  await page1.click("#nextCombatBtn");

  await Promise.all([
    page1.waitForSelector('.online-action-btn[data-action="normal"]:not([disabled])', { timeout: 20000 }),
    page2.waitForSelector('.online-action-btn[data-action="normal"]:not([disabled])', { timeout: 20000 })
  ]);

  const matchId1 = await page1.locator('.online-summary-box[data-turn-summary-match-id]').getAttribute("data-turn-summary-match-id");
  const matchId2 = await page2.locator('.online-summary-box[data-turn-summary-match-id]').getAttribute("data-turn-summary-match-id");
  assert.ok(matchId1 && matchId2, "Both tournament players should have a visible active match");

  await Promise.all([
    page1.locator('.online-action-btn[data-action="normal"]:not([disabled])').click(),
    page2.locator('.online-action-btn[data-action="normal"]:not([disabled])').click()
  ]);

  await Promise.all([waitForResolvedV2(page1), waitForResolvedV2(page2)]);

  const box1 = page1.locator('.online-summary-box[data-turn-summary-version="2"]');
  const box2 = page2.locator('.online-summary-box[data-turn-summary-version="2"]');
  const summary1 = (await box1.innerText()).replace(/\s+/g, " ").trim();
  const summary2 = (await box2.innerText()).replace(/\s+/g, " ").trim();

  assert.ok(!/Damage calc|Critical calc|→ HP:/i.test(summary1));
  assert.ok(!/Damage calc|Critical calc|→ HP:/i.test(summary2));

  if (matchId1 === matchId2) {
    assert.equal(summary1, summary2, "Players in the same Online Tournament match must see the same authoritative round");
  }

  const collapsedCombatLogs1 = await page1.locator(".waft-v2-online-log-collapsed").count();
  const collapsedCombatLogs2 = await page2.locator(".waft-v2-online-log-collapsed").count();
  assert.ok(collapsedCombatLogs1 >= 1, "Host Online Tournament Combat Log should start collapsed");
  assert.ok(collapsedCombatLogs2 >= 1, "Guest Online Tournament Combat Log should start collapsed");

  const fieldHud1 = await page1.locator('[id^="onlineTournamentFieldHud-"]').count();
  const fieldHud2 = await page2.locator('[id^="onlineTournamentFieldHud-"]').count();
  assert.ok(fieldHud1 >= 1, "Host visible tournament match should show battlefield HUD");
  assert.ok(fieldHud2 >= 1, "Guest visible tournament match should show battlefield HUD");

  await page1.locator("#combatPanel").screenshot({ path: screenshotPath });
  assert.deepEqual(pageErrors, [], `Online Tournament browser errors:\n${pageErrors.join("\n\n")}`);

  console.log(`WAFT Online Tournament V2 smoke passed in ${roomCode}: ${fighter1} / ${fighter2}`);
} catch (error) {
  await page1.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
  throw error;
} finally {
  await Promise.all([context1.close(), context2.close()]);
  await browser.close();
}
