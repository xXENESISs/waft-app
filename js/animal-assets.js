export const sharedAnimalImageCandidates = {
  "iberian-ribbed-newt": [
    "./images/animals/amphibians/iberian-ribbed-newt.png",
    "./images/animals/amphibians/gallipato.png",
    "./images/animals/amphibians/gallipato-iberico.png"
  ],

  "iberian-skink": [
    "./images/animals/reptiles/iberian-skink.png",
    "./images/animals/reptiles/eslizon-iberico.png",
    "./images/animals/reptiles/eslizon.png"
  ]
};

export function mergeAnimalImageCandidates(localCandidates = {}) {
  const merged = { ...localCandidates };

  for (const [animalId, sharedCandidates] of Object.entries(sharedAnimalImageCandidates)) {
    merged[animalId] = [
      ...(localCandidates[animalId] || []),
      ...sharedCandidates
    ];
  }

  return merged;
}