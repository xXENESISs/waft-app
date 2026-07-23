export const sharedAnimalImageCandidates = {
  "iberian-ribbed-newt": ["./images/animals/amphibians/iberian-ribbed-newt.png"],
  "iberian-skink": ["./images/animals/reptiles/iberian-skink.png"],
  "bombardier-beetle": ["./images/animals/arthropods/bombardier-beetle.png"]
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