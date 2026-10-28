// Static catalogue integrity checks. Run: node scripts/validate-codex.mjs
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { codexCategories, codexFighters } from "../js/codex-data.js";
import { animals } from "../js/animals.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const fileExists = (p) => Boolean(p && existsSync(path.join(root, p)));

const categoryIds = new Set(codexCategories.map((c) => c.slug));
const slugs = new Set();
const linked = new Set();

check(codexCategories.length === 6, "Codex must have exactly six editorial collections");
check(categoryIds.size === codexCategories.length, "Collection slugs must be unique");
check(codexFighters.length > 0, "The Codex cannot be empty");

for (const c of codexCategories) {
  check(fileExists(c.image), "Missing category background: " + c.image);
  const indexPath = "fighters/" + c.slug + "/index.html";
  check(fileExists(indexPath), "Missing category page: " + indexPath);
  if (fileExists(indexPath)) {
    const html = readFileSync(path.join(root, indexPath), "utf8");
    check(html.includes('data-category="' + c.slug + '"'), "Wrong category route: " + indexPath);
    check(html.includes("../../js/codex-ui.js"), "Missing Codex module import: " + indexPath);
  }
}

for (const f of codexFighters) {
  check(!slugs.has(f.slug), "Duplicate catalogue slug: " + f.slug);
  slugs.add(f.slug);
  check(categoryIds.has(f.category), "Unknown category for: " + f.slug);
  check(fileExists(f.image), "Missing fighter image for " + f.slug + ": " + f.image);
  if (f.archivePage) check(fileExists(f.archivePage), "Broken legacy link for " + f.slug + ": " + f.archivePage);
  if (f.gameId) {
    check(Boolean(animals[f.gameId]), "Missing game definition for: " + f.slug + " → " + f.gameId);
    check(!linked.has(f.gameId), "Multiple Codex entries map to game fighter: " + f.gameId);
    linked.add(f.gameId);
  }
  if (f.biology || f.martialHistory) check(Array.isArray(f.sources) && f.sources.length > 0, "Unreferenced research content: " + f.slug);
  for (const source of f.sources || []) check(/^https:\/\//.test(source.url), "Invalid source URL in " + f.slug);
}

for (const gameId of Object.keys(animals)) {
  check(linked.has(gameId), "Playable game fighter absent from Codex: " + gameId);
}
for (const f of ["archive.html", "codex-profile.html", "js/codex-ui.js", "js/codex-data.js", "css/codex.css"]) {
  check(fileExists(f), "Missing Codex file: " + f);
}
const expectedPlayable = Object.keys(animals).length;
check(linked.size === expectedPlayable, "Playable roster mismatch: " + linked.size + " of " + expectedPlayable);

if (failures.length) {
  for (const problem of failures) console.error("✗ " + problem);
  console.error("\nCodex validation failed: " + failures.length + " issues.");
  process.exitCode = 1;
} else {
  console.log("✓ WAFT Codex valid.");
  console.log("  Collections: " + codexCategories.length);
  console.log("  Profiles: " + codexFighters.length);
  console.log("  Playable profiles: " + linked.size);
  console.log("  Archive-only profiles: " + (codexFighters.length - linked.size));
  console.log("  All referenced fighter images and legacy links exist.");
}
