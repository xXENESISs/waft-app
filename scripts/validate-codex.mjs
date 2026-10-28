// Static catalogue integrity checks. Run: node scripts/validate-codex.mjs
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { codexCategories, codexFighters } from "../js/codex-data.js";
import { animals } from "../js/animals.js";
import { fighters, categories, statsFor, statScale } from "../js/codex-model.js";
import { references, research, martialResearch } from "../js/codex-research.js";
import { tactics } from "../js/codex-tactics.js";

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

// An existing but empty image is not a valid asset (a failure the original test missed).
for (const fighter of fighters) {
  for (const width of [480,960]) {
    const imagePath = `images/codex/${fighter.slug}-${width}.webp`;
    check(fileExists(imagePath), 'Missing optimized artwork: '+imagePath);
    if(fileExists(imagePath)) {
      const data=readFileSync(path.join(root,imagePath));
      check(data.length>100 && data.toString('ascii',0,4)==='RIFF' && data.toString('ascii',8,12)==='WEBP', 'Empty or invalid WebP: '+imagePath);
    }
  }
  if(fighter.game)check(Boolean(tactics[fighter.gameId]),'Missing tactical reading: '+fighter.slug);
  if(fighter.archivePage) {
    const legacy=readFileSync(path.join(root,fighter.archivePage),'utf8');
    check(legacy.includes("has('legacy')") && legacy.includes('fighter='+fighter.slug),'Legacy route lacks dossier migration: '+fighter.slug);
    check(legacy.includes('Documento histórico conservado'),'Missing historical-content notice: '+fighter.slug);
  }
}
for (const c of categories)check(fileExists(c.image) && readFileSync(path.join(root,c.image)).length>100,'Missing or empty collection art: '+c.slug);
const octopus=fighters.find(f=>f.gameId==='coconut-octopus');
check(statScale(octopus)>=statsFor(octopus,'offensive').explosiveness,'Stat scale clips transformed attributes');
for(const [id,reference] of Object.entries(references))check(/^https:\/\//.test(reference.url) && reference.title && reference.kind, 'Invalid editorial reference: '+id);
function verifyReferences(value,context) {
  if(Array.isArray(value))value.forEach(v=>verifyReferences(v,context));
  else if(value && typeof value==='object')for(const [key,child] of Object.entries(value)) {
    if(key==='refs'||key.endsWith('Refs'))for(const id of child||[])check(Boolean(references[id]),'Unknown citation '+id+' in '+context);
    else verifyReferences(child,context);
  }
}
for(const [slug,entry] of Object.entries(research)) {
  check(slugs.has(slug),'Research without catalogue record: '+slug);
  verifyReferences(entry,slug);
  check(entry.summaryRefs?.length>0,'Unreferenced species introduction: '+slug);
  if(entry.range)check(entry.range.refs.length>0 && references[entry.range.source] && entry.range.limitation,'Unprovenanced geography: '+slug);
}
for(const [slug,entry] of Object.entries(martialResearch)){check(slugs.has(slug),'History without record: '+slug);verifyReferences(entry,slug);}
const reviewed=JSON.parse(readFileSync(path.join(root,'docs/codex/reviewed-game-sources.json'),'utf8'));
for(const [file,expected] of Object.entries(reviewed.sha256)) {
  const actual=createHash('sha256').update(readFileSync(path.join(root,file))).digest('hex');
  check(actual===expected,'Game rules changed since the editorial review; review explanations before updating fingerprint: '+file);
}
for(const file of ['archive.html','codex-profile.html',...codexCategories.map(c=>'fighters/'+c.slug+'/index.html')]) {
  const page=readFileSync(path.join(root,file),'utf8');
  check(page.includes('lang="es"'),'Wrong interface language: '+file);
  check(page.includes('skip-link') && page.includes('<noscript>'),'Missing accessible fallback: '+file);
}

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
  console.log("  Original and optimized artwork valid; all legacy routes preserved.");
}
