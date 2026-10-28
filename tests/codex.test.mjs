import test from 'node:test';
import assert from 'node:assert/strict';
import { animals } from '../js/animals.js';
import { fighters,filterFighters,statsFor,statScale,statLabels } from '../js/codex-model.js';
import { research,martialResearch,references } from '../js/codex-research.js';
import { tactics,mechanicalNotes } from '../js/codex-tactics.js';
import { createBattle,transformCoconutOctopus,resolveTurn } from '../js/battle-engine.js';

test('Every playable ID has one archive record; concepts have no official combat data',()=>{
 assert.equal(fighters.length,36);
 assert.deepEqual(fighters.filter(f=>f.game).map(f=>f.gameId).sort(),Object.keys(animals).sort());
 assert.equal(fighters.filter(f=>!f.game).length,10);
 for(const f of fighters){if(f.game){assert.equal(f.game,animals[f.gameId]);assert.equal(statsFor(f),f.game.octopusForms?.base.stats || animals[f.gameId].stats);if(f.game.octopusForms)assert.deepEqual(f.game.octopusForms.base.stats,animals[f.gameId].stats);}else assert.equal(statsFor(f),null);}
});
test('All eight attributes, including every octopus form, use the exact game objects',()=>{
 assert.equal(Object.keys(statLabels).length,8);
 for(const f of fighters.filter(f=>f.game)){
  for(const id of Object.keys(f.game.octopusForms||{base:{}})){
   const expected=f.game.octopusForms?.[id]?.stats||f.game.stats;
   assert.equal(statsFor(f,id),expected);
   for(const key of Object.keys(statLabels))assert.ok(Number.isFinite(expected[key]));
  }
 }
 const octo=fighters.find(f=>f.gameId==='coconut-octopus');
 assert.equal(statScale(octo),150);assert.equal(statsFor(octo,'offensive').explosiveness,150);
 assert.equal(statsFor(octo,'defensive').defense,120);assert.equal(statsFor(octo,'evasive').agility,150);
});
test('Search accepts accents, both common-name languages, scientific names and multiple terms',()=>{
 for(const query of ['fenec','FÉNEC','fennec','Vulpes zerda'])assert.equal(filterFighters(fighters,{q:query})[0]?.slug,'fennec');
 assert.equal(filterFighters(fighters,{q:'pulpo kali'})[0]?.slug,'coconut-octopus');
 assert.equal(filterFighters(fighters,{q:'rana darwin'})[0]?.slug,'darwins-frog');
 assert.equal(filterFighters(fighters,{q:'unmatched-entry'}).length,0);
});
test('Geographic filters never interpret inherited character affiliation as native range',()=>{
 assert.ok(!filterFighters(fighters,{q:'Myanmar'}).some(f=>f.slug==='sailfish'));
 assert.ok(filterFighters(fighters,{region:'america'}).some(f=>f.slug==='matamata'));
 assert.ok(!filterFighters(fighters,{region:'america'}).some(f=>f.slug==='axolotl'));
 assert.ok(!filterFighters(fighters,{region:'asia'}).some(f=>f.slug==='emerald-jewel-wasp'));
 assert.equal(filterFighters(fighters,{status:'concept'}).length,10);
 assert.ok(filterFighters(fighters,{category:'birds'}).every(f=>f.category==='birds'));
});
test('Reviewed claims resolve to real reference records and geography has provenance',()=>{
 function walk(value){if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')for(const [k,v] of Object.entries(value)){if(k==='refs'||k.endsWith('Refs'))for(const id of v||[])assert.ok(references[id],id);else walk(v);}}
 walk(research);walk(martialResearch);
 for(const r of Object.values(research)){assert.ok(r.summaryRefs.length);if(r.range){assert.ok(references[r.range.source]);assert.ok(r.range.refs.length);assert.ok(r.range.limitation);}}
 assert.equal(Object.keys(research).length,7);assert.equal(Object.keys(martialResearch).length,4);
 for(const id of Object.keys(tactics))assert.ok(animals[id]);
 assert.equal(Object.keys(tactics).length,Object.keys(animals).length);
});
test('Octopus documentation agrees with actual free transformation and independent charge storage',()=>{
 const b=createBattle('coconut-octopus','matamata'),f=b.fighterA;
 assert.equal(f.octopusAdaptationCharges,8);
 assert.ok(transformCoconutOctopus(f,'offensive',b).ok);assert.equal(f.octopusAdaptationCharges,8);
 f.specialCharge=3;f.octopusPredatoryPressureStacks=4;
 assert.ok(transformCoconutOctopus(f,'evasive',b).ok);assert.equal(f.octopusAdaptationCharges,7);
 assert.equal(f.octopusPredatoryPressureStacks,0);assert.equal(f.specialCharge,0);
 assert.ok(transformCoconutOctopus(f,'offensive',b).ok);assert.equal(f.specialCharge,3);
});
test('Larval command spends the configured resource, restores both resources and adds guaranteed damage',()=>{
 const saved=Math.random;Math.random=()=>0.99;
 try{const b=createBattle('darwins-frog','matamata');b.biome='forest';b.biomeStat=null;
 const f=b.fighterA,t=b.fighterB;f.hp=400;f.stamina=100;f.darwinsLarvae=5;f.darwinsLarvalCommand={attack:2,defense:2,sacrifice:1};
 const hp=t.hp;resolveTurn(b,'concentration','concentration');
 assert.equal(f.darwinsLarvae,0);assert.equal(f.hp,470);assert.equal(f.stamina,170);
 assert.equal(t.hp,hp-2*Math.round(f.stats.attack*.5)+20);
 assert.ok(b.log.some(line=>line.includes('2 defend')));
 }finally{Math.random=saved;}
});
test('Matamata multi-hit discrepancy is observable and documented, without changing the engine',()=>{
 const saved=Math.random;Math.random=()=>0;
 try{const b=createBattle('coconut-octopus','matamata');b.biome='forest';b.biomeStat=null;
 transformCoconutOctopus(b.fighterA,'offensive',b);b.fighterA.specialCharge=6;b.fighterA.octopusSpecialCharges.offensive=6;b.fighterB.specialCharge=4;
 resolveTurn(b,'special','special');
 assert.equal(b.log.filter(s=>s.includes('Ancestral Retreat reduces incoming direct damage')).length,8);
 assert.match(mechanicalNotes.matamata[0].text,/no se consume con el primer impacto/);
 }finally{Math.random=saved;}
});
