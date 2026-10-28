// WAFT Codex UI. Archive-only: combat engine and multiplayer are untouched.
import { codexCategories, codexFighters } from "./codex-data.js";
import { animals } from "./animals.js";

const root = document.getElementById("codex-root");
const base = new URL("../", import.meta.url);
const url = (path) => new URL(path, base).href;
const html = (input) => String(input ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const byCategory = (slug) => codexFighters.filter((f) => f.category === slug);
const getCategory = (slug) => codexCategories.find((cat) => cat.slug === slug);
const profileUrl = (fighter) => url("codex-profile.html?fighter=" + encodeURIComponent(fighter.slug));
const categoryUrl = (category) => url("fighters/" + category.slug + "/index.html");
const imageUrl = (fighter) => url(fighter.image);
const clean = (v) => (v ? html(v) : "Not documented yet");
const statusText = (f) => f.gameId ? "In the game" : "Archive concept";
const statusClass = (f) => f.gameId ? "" : " codex-status--concept";

function breadcrumb(parts) {
  return '<nav class="codex-breadcrumb" aria-label="Breadcrumb">' + ['<a href="' + url('archive.html') + '">Codex</a>']
    .concat(parts.map((part) => part.href ? '<span aria-hidden="true">/</span><a href="' + html(part.href) + '">' + html(part.label) + '</a>' : '<span aria-hidden="true">/</span><span aria-current="page">' + html(part.label) + '</span>')).join("") + '</nav>';
}

function fighterCard(f) {
  return '<a class="codex-fighter-card" href="' + profileUrl(f) + '" aria-label="Open ' + html(f.name) + ' profile">' +
    '<div class="codex-card-media"><img loading="lazy" src="' + imageUrl(f) + '" alt="WAFT character illustration of ' + html(f.name) + '">' +
    '<span class="codex-status' + statusClass(f) + '">' + statusText(f) + '</span></div>' +
    '<div class="codex-card-content"><h2>' + html(f.name) + '</h2><p>' + html(f.martial || "Martial discipline to be documented") + '</p>' +
    '<p>' + html(f.region || "Region pending verification") + '</p><span class="codex-text-link">Explore fighter →</span></div></a>';
}

function categoryTile(cat) {
  const count = byCategory(cat.slug).length;
  return '<a class="codex-category-tile" style="--tile-image:url(' + "'" + url(cat.image) + "'" + ')" href="' + categoryUrl(cat) + '">' +
    '<span class="codex-category-kicker">' + html(cat.latin) + '</span><h3>' + html(cat.label) + '</h3>' +
    '<p>' + html(cat.description) + '</p><div class="codex-category-bottom"><span>' + count + ' fighters</span><span aria-hidden="true">↗</span></div></a>';
}

function renderLanding() {
  const playable = codexFighters.filter((f) => f.gameId).length;
  const concepts = codexFighters.length - playable;
  const features = ["matamata", "coconut-octopus"].map((id) => codexFighters.find((f) => f.slug === id));
  root.innerHTML =
    '<section class="codex-hero"><div class="codex-eyebrow">The World Animal Fight Tournament</div><div class="codex-hero-line">' +
    '<div><h1 class="codex-h1">The Fighter<br><em>Codex.</em></h1><p>Explore the real animals, martial traditions and game mechanics behind the WAFT roster. A field guide to the world beyond the arena.</p></div>' +
    '<div class="codex-counts"><div class="codex-count"><strong>' + codexCategories.length + '</strong><span>Collections</span></div><div class="codex-count"><strong>' + codexFighters.length + '</strong><span>Profiles</span></div><div class="codex-count"><strong>' + playable + '</strong><span>Playable</span></div></div></div></section>' +
    '<section class="codex-section"><div class="codex-section-head"><div><div class="codex-eyebrow">Browse by collection</div><h2 class="codex-h2">Six paths into WAFT</h2></div><p>These are editorial collections, not six equivalent taxonomic ranks: marine life includes mammals and invertebrates.</p></div><div class="codex-category-grid">' + codexCategories.map(categoryTile).join("") + '</div></section>' +
    '<section class="codex-section"><div class="codex-section-head"><div><div class="codex-eyebrow">Featured profiles</div><h2 class="codex-h2">Inside the species</h2></div><p>Two researched examples combine natural history, martial arts context and combat abilities.</p></div>' +
    '<div class="codex-featured">' + features.map((f) => '<a class="codex-featured-item" href="' + profileUrl(f) + '"><img loading="lazy" alt="' + html(f.name) + ' character" src="' + imageUrl(f) + '"><div class="codex-featured-body"><span class="codex-category-kicker">' + html(getCategory(f.category)?.label) + '</span><h3>' + html(f.name) + '</h3><p>' + html(f.martial || '') + '</p><span class="codex-text-link">Read research & tactics →</span></div></a>').join("") + '</div></section>' +
    '<div class="codex-note" style="margin-bottom:80px"><strong>Catalogue status:</strong> ' + playable + ' fighters are present in the current game engine. ' + concepts + ' additional archive characters are concepts, not playable entries. A character’s real-world ecology is different from its fictional WAFT biome bonuses. Research is being added progressively; unverified fields are explicitly marked.</div>';
}

function renderCategory(slug) {
  const cat = getCategory(slug);
  if (!cat) { renderMissing("Collection not found"); return; }
  const entries = byCategory(slug);
  root.innerHTML = breadcrumb([{label:cat.label}]) +
    '<section class="codex-category-hero" style="--category-image:url(' + "'" + url(cat.image) + "'" + ')"><span class="codex-category-kicker">' + html(cat.latin) + ' · ' + entries.length + ' records</span><h1>' + html(cat.label) + '</h1><p>' + html(cat.description) + '</p></section>' +
    '<div class="codex-toolbar"><label class="codex-search"><input id="codex-query" type="search" aria-label="Find a fighter" placeholder="Search animals or martial arts…" autocomplete="off"></label><div class="codex-filter-set" role="group" aria-label="Filter fighter status"><button class="codex-filter" data-filter="all" aria-pressed="true">All</button><button class="codex-filter" data-filter="game" aria-pressed="false">Playable</button><button class="codex-filter" data-filter="concept" aria-pressed="false">Archive</button></div><select id="codex-sort" class="codex-sort" aria-label="Sort fighters"><option value="original">Archive order</option><option value="name">Name A–Z</option></select></div>' +
    '<p class="codex-results-count" id="codex-results-count" aria-live="polite"></p><div class="codex-fighter-grid" id="codex-list"></div>' +
    '<div class="codex-note" style="margin-bottom:55px">Archive-only entries do not have verified playable stats. For implemented fighters, combat stats and ability descriptions are loaded directly from the current WAFT game data.</div>';
  const search = document.getElementById("codex-query");
  const sort = document.getElementById("codex-sort");
  const list = document.getElementById("codex-list");
  const counter = document.getElementById("codex-results-count");
  let filter = "all";
  function update() {
    const q = search.value.trim().toLocaleLowerCase();
    const filtered = entries.filter((f) => (filter === "all" || (filter === "game" ? Boolean(f.gameId) : !f.gameId)) &&
      [f.name, f.martial, f.region, f.scientific].some((x) => String(x || "").toLocaleLowerCase().includes(q)));
    if (sort.value === "name") filtered.sort((a,b) => a.name.localeCompare(b.name));
    counter.textContent = filtered.length + " of " + entries.length + " profiles";
    list.innerHTML = filtered.length ? filtered.map(fighterCard).join("") : '<div class="codex-empty">No fighters match these filters.</div>';
  }
  search.addEventListener("input", update);
  sort.addEventListener("change", update);
  for (const b of root.querySelectorAll("[data-filter]")) b.addEventListener("click", () => {
    filter = b.dataset.filter;
    for(const button of root.querySelectorAll("[data-filter]")) button.setAttribute("aria-pressed", String(button.dataset.filter === filter));
    update();
  });
  update();
}

function factBox(title, content) {
  return '<div class="codex-fact-box"><small>' + html(title) + '</small><div>' + clean(content) + '</div></div>';
}
function chapter(id, name, kicker, inner) {
  return '<section class="codex-chapter" id="' + id + '"><div class="codex-eyebrow">' + html(kicker) + '</div><h2 class="codex-h2">' + html(name) + '</h2>' + inner + '</section>';
}
function biology(f) {
  return chapter("biology","The animal in nature","Real-world biology",
    '<div class="codex-fact-grid">' + factBox("Scientific designation",f.scientific || animals[f.gameId]?.scientificName) + factBox("Range",f.region) +
    factBox("Habitat",f.habitat) + factBox("WAFT collection",getCategory(f.category)?.label) + '</div>' +
    (f.biology ? '<p>' + html(f.biology) + '</p>' : '<p class="codex-small">A fully sourced species overview, including geographic distribution, habitat adaptations, diet and conservation, has not yet been reviewed for this character. Existing archive labels are provisional, not a verified range map.</p>'));
}
function martial(f) {
  return chapter("martial","Martial arts & history","Cultural background",
    '<div class="codex-fact-grid">' + factBox("Assigned discipline",f.martial) + factBox("Historical status",f.martialHistory?"Research added":"Pending source review") + '</div>' +
    (f.martialHistory ? '<p>' + html(f.martialHistory) + '</p>' : '<p>WAFT associates this character with a martial art or combat tradition. The exact history and cultural context still need independent references before they are presented as factual.</p>') +
    '<h3>Why this fighter?</h3>' + (f.waftConnection ? '<p>' + html(f.waftConnection) + '</p>' : '<p>The fictional pairing between this animal and its combat tradition is part of WAFT’s creative worldbuilding. An explanation of the stylistic connection will be developed separately from the historical record.</p>'));
}
function gameplay(f, fighter) {
  if (!fighter) {
    return chapter("gameplay","Game mechanics","WAFT gameplay",
      '<div class="codex-note"><strong>Archive concept.</strong> This fighter is in the encyclopaedia but is not implemented as a selectable character in the current game motor. We will not invent passives, special attacks or official stats for it.</div>');
  }
  const ab = (type, obj) => '<div class="codex-ability"><small>' + html(type) + '</small><strong>' + html(obj?.name || "Not defined") + '</strong><p>' + html(obj?.description || "No description supplied in the game data.") + '</p>' +
    (obj?.chargeType ? '<p style="margin-top:7px">Charge type: ' + html(obj.chargeType) + (obj.chargeHits ? " · " + html(obj.chargeHits) + " hits" : "") + '</p>' : '') + '</div>';
  let preview = '';
  if (fighter.mechanicsPreview?.sections?.length) {
    preview = '<h3>Special mechanics and commands</h3>' + fighter.mechanicsPreview.sections.map(s =>
      '<div class="codex-ability"><strong>' + html(s.icon || '') + ' ' + html(s.title || "Mechanic") + '</strong>' +
      (s.lines||[]).map(line=>'<p>' + html(line) + '</p>').join('') + '</div>').join('');
  }
  return chapter("gameplay","Combat identity","WAFT gameplay",
    '<p>These are <strong>game mechanics, not animal biology</strong>. The values and descriptions are taken from the current WAFT fighter definitions rather than manually copied into the Codex.</p>' +
    ab("Passive ability",fighter.passive) + ab("Special attack",fighter.special) + preview +
    '<p class="codex-small">The detailed combat formulas and action rules are in the <a class="codex-text-link" href="' + url('combat-guide.html') + '">Combat Guide</a>.</p>');
}
function sources(f) {
  const links=f.sources||[];
  return chapter("sources","Sources & provenance","Editorial references",
    links.length ? '<p>External references support the biology and martial-arts history above. WAFT-specific techniques and stats come from the game data.</p><div class="codex-sources">' +
    links.map(s=>'<a class="codex-source" href="' + html(s.url) + '" target="_blank" rel="noopener noreferrer"><span><strong>' + html(s.title) + '</strong><small>' + html(s.type) + '</small></span><span aria-hidden="true">↗</span></a>').join("") + '</div>' :
    '<p>This profile does not yet contain independently verified scientific and martial-history sources. The historical archive page is retained for reference, but its text should not be treated as verified research.</p>' +
    (f.archivePage ? '<p><a class="codex-text-link" href="' + url(f.archivePage) + '">View original archived profile →</a></p>' : ''));
}
const labels={life:"Life",attack:"Attack",defense:"Defense",resistance:"Stamina",technique:"Technique",speed:"Speed",agility:"Agility",explosiveness:"Explosiveness"};
function sidebar(f, fighter) {
  if (!fighter) return '<div class="codex-sidebar-panel"><h3>Archive character</h3><p>Combat data not yet implemented. This page remains available for historical and visual documentation.</p></div>';
  const stats=Object.entries(labels).map(([key,name])=>{
    const value=Number(fighter.stats?.[key])||0;
    const clipped=Math.max(0,Math.min(100,value));
    return '<div class="codex-stat"><label>' + name + '</label><div class="codex-stat-track"><div class="codex-stat-fill" style="width:' + clipped + '%"></div></div><span class="codex-stat-value">' + html(value) + '</span></div>';
  }).join("");
  const biomes=Object.entries({favorable:"Favourable",neutral:"Neutral",unfavorable:"Unfavourable"}).map(([key,value])=>
    '<div class="codex-biome"><label>' + value + '</label><div class="codex-chips">' + (fighter.biomes?.[key] || []).map(b=>'<span class="codex-chip">' + html(b) + '</span>').join("") + '</div></div>').join("");
  return '<div class="codex-sidebar-panel"><div class="codex-eyebrow">Current game data</div><h3>Combat attributes</h3><div class="codex-stats">' + stats + '</div>' +
   '<p>Base attributes (0–100 scale); they are not the battle HP / stamina resource totals.</p></div>' +
   '<div class="codex-sidebar-panel"><h3>Biome affinities</h3><p>These are fictional in-game arena modifiers, not a description of the animal’s natural geographic habitat.</p>' + biomes + '</div>' +
   '<div class="codex-sidebar-panel"><h3>Enter the arena</h3><p>Explore the available combat modes with this character in mind.</p><a class="codex-text-link" href="' + url('test.html') + '">Single Battle →</a></div>';
}
function renderProfile(slug) {
  const f=codexFighters.find(f=>f.slug===slug);
  if(!f){renderMissing("Fighter not found");return;}
  const cat=getCategory(f.category);
  const fighter=f.gameId ? animals[f.gameId] : null;
  const others=byCategory(f.category),i=others.findIndex(x=>x.slug===f.slug);
  const prev=others[i-1],next=others[i+1];
  document.title=f.name+" | WAFT Codex";
  root.innerHTML=breadcrumb([{label:cat?.label ||"Collection",href:categoryUrl(cat)},{label:f.name}]) +
    '<section class="codex-profile-hero"><div class="codex-profile-visual"><img src="' + imageUrl(f) + '" alt="WAFT character illustration of ' + html(f.name) + '">' +
    '<span class="codex-status' + statusClass(f) + '">' + statusText(f) + '</span></div>' +
    '<div class="codex-profile-intro"><div class="codex-eyebrow">Fighter dossier · ' + html(cat?.label || "") + '</div>' +
    '<h1 class="codex-h1">' + html(f.name) + '</h1><p class="codex-scientific">' + clean(f.scientific || fighter?.scientificName) + '</p>' +
    '<dl class="codex-facts"><div><dt>Collection</dt><dd>' + html(cat?.label || "") + '</dd></div><div><dt>Region</dt><dd>' + clean(f.region) + '</dd></div>' +
    '<div><dt>Martial art</dt><dd>' + clean(f.martial) + '</dd></div><div><dt>Game status</dt><dd>' + statusText(f) + '</dd></div></dl>' +
    '<p>A guide to this fighter’s real-world inspiration and its fictional tactical identity. Biology, martial history and gameplay are documented as separate subjects.</p></div></section>' +
    '<nav class="codex-toc" aria-label="Profile sections"><a href="#biology">Biology</a><a href="#martial">Martial art</a><a href="#gameplay">Gameplay</a><a href="#sources">Sources</a></nav>' +
    '<div class="codex-profile-layout"><div>' + biology(f) + martial(f) + gameplay(f,fighter) + sources(f) + '</div><aside class="codex-sidebar" aria-label="Combat data">' + sidebar(f,fighter) + '</aside></div>' +
    '<nav class="codex-profile-pager" aria-label="Adjacent fighters"><span>' + (prev?'<a href="' + profileUrl(prev) + '">← ' + html(prev.name) + '</a>':'') + '</span><span>' + (next?'<a href="' + profileUrl(next) + '">' + html(next.name) + ' →</a>':'') + '</span></nav>';
}
function renderMissing(message) {
  root.innerHTML='<div class="codex-empty" style="margin:90px 0"><h1>' + html(message) + '</h1><p><a class="codex-text-link" href="' + url('archive.html') + '">Return to the Codex →</a></p></div>';
}
if(root) {
  const page=document.body.dataset.codexPage;
  if(page==="category")renderCategory(document.body.dataset.category);
  else if(page==="profile")renderProfile(new URLSearchParams(location.search).get("fighter"));
  else renderLanding();
}
