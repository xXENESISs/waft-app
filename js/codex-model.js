// Archive adapter: read-only access to the game's canonical fighter definitions.
import { animals } from './animals.js';
import { codexCategories, codexFighters } from './codex-data.js';
import { research, martialResearch } from './codex-research.js';

export const statLabels = { life:'Vida', attack:'Ataque', defense:'Defensa', resistance:'Resistencia', speed:'Velocidad', agility:'Agilidad', technique:'Técnica', explosiveness:'Explosividad' };
export const biomeLabels = { forest:'Bosque', jungle:'Selva', desert:'Desierto', arctic:'Ártico', marine:'Marino', mountain:'Montaña' };
export const regionLabels = { africa:'África', america:'América', asia:'Asia', europe:'Europa', oceania:'Oceanía', indian:'Océano Índico', pacific:'Océano Pacífico' };
const translatedCategories = {
  mammals:['Mamíferos','Pelaje, garras y una extraordinaria diversidad de formas de vida.','#cfac76'],
  birds:['Aves','Del dosel al cielo abierto. Precisión, plumas y movimiento.','#b9c9e5'],
  reptiles:['Reptiles','Escamas, camuflaje y el arte de esperar el momento exacto.','#b8c794'],
  amphibians:['Anfibios','Entre la tierra y el agua. Adaptaciones que desafían lo esperado.','#83cbb4'],
  'fish-and-marine-invertebrates':['Fauna marina','Peces, moluscos, crustáceos y mamíferos en una misma colección.','#8fc9de'],
  'arthropods-and-other-invertebrates':['Artrópodos y otros invertebrados','Exoesqueletos, defensas químicas y pequeñas formas de gran complejidad.','#d4b4a6']
};
const commonNames = {
  'fennec':'Fénec', 'honey-badger':'Tejón de la miel', 'white-rhino':'Rinoceronte blanco',
  'sumatran-tiger':'Tigre de Sumatra', 'tibetan-macaque':'Macaco tibetano', 'dracula-parrot':'Loro de Pesquet',
  'kakapo':'Kākāpō', 'peregrine-falcon':'Halcón peregrino', 'shima-enaga':'Shima enaga',
  'eurasian-eagle-owl':'Búho real', 'black-caiman':'Caimán negro', 'green-iguana':'Iguana verde',
  'indian-chameleon':'Camaleón indio', 'matamata':'Matamata', 'texas-horned-lizard':'Lagarto cornudo de Texas',
  'axolotl':'Ajolote', 'japanese-giant-salamander':'Salamandra gigante japonesa',
  'japanese-fire-bellied-newt':'Tritón de vientre de fuego japonés', 'mossy-frog':'Rana musgosa',
  'kaisers-spotted-newt':'Tritón de Kaiser', 'sailfish':'Pez vela', 'walrus':'Morsa',
  'mantis-shrimp':'Camarón mantis', 'pufferfish':'Pez globo', 'narwhal':'Narval',
  'coconut-octopus':'Pulpo cocotero', 'tibetan-apollo-butterfly':'Mariposa apolo tibetana',
  'emerald-jewel-wasp':'Avispa esmeralda', 'dung-beetle':'Escarabajo pelotero', 'tick':'Garrapata',
  'asian-giant-mantis':'Mantis gigante asiática', 'darwins-frog':'Rana de Darwin',
  'iberian-ribbed-newt':'Gallipato', 'three-toed-sloth':'Perezoso de tres dedos',
  'iberian-skink':'Eslizón ibérico', 'bombardier-beetle':'Escarabajo bombardero'
};
// Identifications transcribed from the retained archive, not promoted to reviewed taxonomy.
const inheritedTaxa = {
  'fennec':'Vulpes zerda','honey-badger':'Mellivora capensis','white-rhino':'Ceratotherium simum',
  'sumatran-tiger':'Panthera tigris sumatrae','tibetan-macaque':'Macaca thibetana','dracula-parrot':'Psittrichas fulgidus',
  'kakapo':'Strigops habroptilus','peregrine-falcon':'Falco peregrinus','shima-enaga':'Aegithalos caudatus japonicus',
  'eurasian-eagle-owl':'Bubo bubo','black-caiman':'Melanosuchus niger','green-iguana':'Iguana iguana',
  'indian-chameleon':'Chamaeleo zeylanicus','texas-horned-lizard':'Phrynosoma cornutum','axolotl':'Ambystoma mexicanum',
  'japanese-giant-salamander':'Andrias japonicus','japanese-fire-bellied-newt':'Cynops pyrrhogaster',
  'mossy-frog':'Theloderma corticale','kaisers-spotted-newt':'Neurergus kaiseri','sailfish':'Istiophorus platypterus',
  'walrus':'Odobenus rosmarus','mantis-shrimp':'Odontodactylus scyllarus','pufferfish':'Tetraodontidae · familia',
  'narwhal':'Monodon monoceros','tibetan-apollo-butterfly':'Parnassius epaphus','emerald-jewel-wasp':'Ampulex compressa',
  'dung-beetle':'Scarabaeus sacer','tick':'Ixodida · orden','asian-giant-mantis':'Hierodula tenuidentata'
};
export const categories = codexCategories.map(c => ({...c, originalImage:c.image, image:c.image.replace('images/backgrounds/','images/codex/').replace('-bg.png','-bg.webp'), label:translatedCategories[c.slug][0], description:translatedCategories[c.slug][1], color:translatedCategories[c.slug][2]}));
export const fighters = codexFighters.map((f,index) => {
  const game = f.gameId ? animals[f.gameId] : null;
  const r = research[f.slug] || null;
  return {...f, number:String(index+1).padStart(3,'0'), name:commonNames[f.slug] || f.name, originalName:f.name,
    game, research:r, martial:game?.martialArt?.name || f.martial,
    scientific:r?.scientific || game?.scientificName || inheritedTaxa[f.slug] || f.scientific,
    discipline:martialResearch[f.slug] || null,
    categoryData:categories.find(c=>c.slug===f.category)};
});
export function normalize(text) { return String(text ?? '').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase('es').replace(/[’']/g,''); }
export function filterFighters(entries, {q='', status='all', category='', region='', sort='archive'}={}) {
  const terms = normalize(q).trim().split(/\s+/).filter(Boolean);
  const result = entries.filter(f => {
    const haystack=normalize([f.name,f.originalName,f.scientific,f.martial,f.categoryData.label,
      f.research?.range?.summary, ...(f.research?.range?.regions || []).map(r=>r.label),
      ...(f.research?.range?.areas || []).map(a=>regionLabels[a]), f.discipline?.origin].join(' '));
    return (!category || f.category===category) && (status==='all' || (status==='game' ? !!f.game : !f.game)) &&
      (!region || f.research?.range?.areas.includes(region)) && terms.every(t=>haystack.includes(t));
  });
  if(sort==='name') result.sort((a,b)=>a.name.localeCompare(b.name,'es'));
  if(sort==='research') result.sort((a,b)=>Number(!!b.research)-Number(!!a.research) || a.name.localeCompare(b.name,'es'));
  return result;
}
export function statsFor(fighter, form='base') {
  if(!fighter?.game) return null;
  return fighter.game.octopusForms?.[form]?.stats || fighter.game.stats;
}
export function statScale(fighter) {
  const sets=fighter.game?.octopusForms ? Object.values(fighter.game.octopusForms).map(f=>f.stats) : [fighter.game?.stats];
  return Math.max(100,...sets.filter(Boolean).flatMap(s=>Object.values(s)));
}
