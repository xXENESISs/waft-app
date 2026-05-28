export const animals = {
  "sumatran-tiger": {
    id: "sumatran-tiger",
    name: "Sumatran Tiger",
    category: "mammals",

    stats: {
      life: 72,
      attack: 84,
      defense: 76,
      resistance: 72,
      technique: 79,
      speed: 74,
      agility: 79,
      explosiveness: 64
    },

    biomes: {
      favorable: ["jungle", "forest"],
      neutral: ["mountain", "marine"],
      unfavorable: ["desert", "arctic"]
    },

    passive: {
      id: "feline-instinct",
      name: "Feline Instinct",
      description:
        "If the opponent is below 50% stamina: +10% speed, +10% precision and +25% explosive damage."
    },

    special: {
      id: "lethal-bite",
      name: "Lethal Bite",
      description:
        "Ignores 50% defense and applies Bleed (15 damage per turn for 2 turns).",
      chargeType: "offensive",
      chargeHits: 4
    }
  },

  "walrus": {
    id: "walrus",
    name: "Walrus",
    category: "fish-and-marine-invertebrates",

    stats: {
      life: 97,
      attack: 83,
      defense: 93,
      resistance: 94,
      technique: 62,
      speed: 48,
      agility: 41,
      explosiveness: 82
    },

    biomes: {
      favorable: ["arctic", "marine"],
      neutral: ["forest", "mountain"],
      unfavorable: ["desert", "jungle"]
    },

    passive: {
      id: "frozen-impact",
      name: "Frozen Impact",
      description:
        "Critical hits reduce enemy Agility by 20% for 2 turns (4 in Arctic biome)."
    },

    special: {
      id: "arctic-storm",
      name: "Arctic Storm",
      description:
        "Activates hail (3 turns, 6 in Arctic): −15 HP/turn to all and +15 HP/turn to Walrus. During hail: speed ×2 (permanent in Arctic biome).",
      chargeType: "defensive",
      chargeHits: 5
    }
  },

  "shima-enaga": {
    id: "shima-enaga",
    name: "Shima Enaga",
    category: "birds",

    stats: {
      life: 58,
      attack: 52,
      defense: 54,
      resistance: 61,
      technique: 89,
      speed: 91,
      agility: 98,
      explosiveness: 47
    },

    biomes: {
      favorable: ["arctic", "forest"],
      neutral: ["mountain", "jungle"],
      unfavorable: ["marine", "desert"]
    },

    passive: {
      id: "inverted-inertia",
      name: "Inverted Inertia",
      description:
        "When the user dodges an attack, it automatically counterattacks for 50% of the attacker's Attack. This counter cannot crit, cannot apply effects and costs no stamina."
    },

    special: {
      id: "illusory-dance",
      name: "Illusory Dance",
      description:
        "Reduces received damage by 50% this turn. If the opponent misses or uses Concentration, the user's next attack is guaranteed and gains +50% damage.",
      chargeType: "reactive",
      chargeHits: 4
    }
  },

  "mantis-shrimp": {
    id: "mantis-shrimp",
    name: "Mantis Shrimp",
    category: "fish-and-marine-invertebrates",

    stats: {
      life: 67,
      attack: 86,
      defense: 63,
      resistance: 66,
      technique: 74,
      speed: 69,
      agility: 72,
      explosiveness: 100
    },

    biomes: {
      favorable: ["marine", "forest"],
      neutral: ["arctic", "jungle"],
      unfavorable: ["desert", "mountain"]
    },

    passive: {
      id: "ballistic-impulse",
      name: "Ballistic Impulse",
      description:
        "Explosive Attacks cost 5 less stamina."
    },

    special: {
      id: "marine-flash",
      name: "Ballistic Strike",
      description:
        "Maximum priority. Deals x2 damage, uses Explosiveness as accuracy and has 80% crit chance. If it misses, it deals 25% of the special's base damage to the opponent and 50% to itself.",
      chargeType: "offensive",
      chargeHits: 4
    }
  },

  "dung-beetle": {
    id: "dung-beetle",
    name: "Dung Beetle",
    category: "arthropods-and-other-invertebrates",

    stats: {
      life: 88,
      attack: 100,
      defense: 82,
      resistance: 84,
      technique: 54,
      speed: 55,
      agility: 51,
      explosiveness: 86
    },

    biomes: {
      favorable: ["desert", "forest"],
      neutral: ["jungle", "mountain"],
      unfavorable: ["marine", "arctic"]
    },

    passive: {
      id: "momentum",
      name: "Momentum",
      description:
        "Each consecutive successful attack increases damage: +5%, +10%, +15%, +20%. Resets if an attack misses or the user skips attacking."
    },

    special: {
      id: "dung-throw",
      name: "Dung Throw",
      description:
        "Uses 100% Attack as accuracy. If it hits, deals heavy damage and reduces enemy Agility by 50% for 3 turns (non-stackable).",
      chargeType: "offensive",
      chargeHits: 5
    }
  },

  "caiman": {
    id: "caiman",
    name: "Caiman",
    category: "reptiles",

    stats: {
      life: 88,
      attack: 91,
      defense: 86,
      resistance: 74,
      technique: 66,
      speed: 59,
      agility: 63,
      explosiveness: 73
    },

    biomes: {
      favorable: ["marine", "jungle"],
      neutral: ["forest", "mountain"],
      unfavorable: ["desert", "arctic"]
    },

    passive: {
      id: "relentless-bite",
      name: "Relentless Bite",
      description:
        "Explosive attacks ignore 20% defense and apply Bite on hit. Bite: -20% Agility, last up to 5 turns, 50% chance to escape each turn."
    },

    special: {
      id: "death-roll",
      name: "Death Roll",
      description:
        "Normal attack. If the opponent has Bite: x2 damage, ignores defense and cannot be dodged.",
      chargeType: "offensive",
      chargeHits: 4
    }
  },

  "axolotl": {
    id: "axolotl",
    name: "Axolotl",
    category: "amphibians",

    stats: {
      life: 100,
      attack: 78,
      defense: 68,
      resistance: 64,
      technique: 77,
      speed: 63,
      agility: 76,
      explosiveness: 74
    },

    biomes: {
      favorable: ["marine", "mountain"],
      neutral: ["forest", "jungle"],
      unfavorable: ["arctic", "desert"]
    },

    passive: {
      id: "neotenic-regeneration",
      name: "Neotenic Regeneration",
      description:
        "At the end of each turn, has a 50% chance to restore 20 HP."
    },

    special: {
      id: "total-regeneration",
      name: "Total Regeneration",
      description:
        "Restores all HP lost during the last turn x2. Does not deal damage.",
      chargeType: "defensive",
      chargeHits: 6
    }
  },

  "emerald-wasp": {
    id: "emerald-wasp",
    name: "Emerald Wasp",
    category: "arthropods-and-other-invertebrates",

    stats: {
      life: 74,
      attack: 72,
      defense: 58,
      resistance: 71,
      technique: 100,
      speed: 77,
      agility: 83,
      explosiveness: 65
    },

    biomes: {
      favorable: ["jungle", "forest"],
      neutral: ["mountain", "marine"],
      unfavorable: ["desert", "arctic"]
    },

    passive: {
      id: "parasitic-control",
      name: "Parasitic Control",
      description:
        "After landing 3 consecutive hits, the opponent cannot use Concentration or Special Attack and has a 50% chance to hit itself for 1 turn. Missing resets the chain."
    },

    special: {
      id: "nervous-disruption",
      name: "Nervous Disruption",
      description:
        "Uses Technique as accuracy. On the opponent's next turn, it hits itself and cannot use Concentration or Special Attack.",
      chargeType: "offensive",
      chargeHits: 4
    }
  },

  "peregrine-falcon": {
    id: "peregrine-falcon",
    name: "Peregrine falcon",
    category: "birds",

    stats: {
      life: 63,
      attack: 74,
      defense: 61,
      resistance: 62,
      technique: 83,
      speed: 100,
      agility: 88,
      explosiveness: 69
    },

    biomes: {
      favorable: ["mountain", "marine"],
      neutral: ["desert", "arctic"],
      unfavorable: ["forest", "jungle"]
    },

    passive: {
      id: "hunting-inertia",
      name: "Hunting Inertia",
      description:
        "Each successful hit grants +10% damage (max 3 stacks). Missing resets all stacks."
    },

    special: {
      id: "deadly-dive",
      name: "Deadly Dive",
      description:
        "Reduces opponent accuracy to 25% this turn, then attacks with increased damage based on stacks and reduces precision and evasion.",
      chargeType: "offensive",
      chargeHits: 5
    }
  },

  "sailfish": {
    id: "sailfish",
    name: "Sailfish",
    category: "fish-and-marine-invertebrates",

    stats: {
      life: 67,
      attack: 86,
      defense: 52,
      resistance: 72,
      technique: 78,
      speed: 98,
      agility: 89,
      explosiveness: 58
    },

    biomes: {
      favorable: ["marine", "arctic"],
      neutral: ["forest", "jungle"],
      unfavorable: ["mountain", "desert"]
    },

    passive: {
      id: "marine-echo",
      name: "Marine Echo",
      description:
        "After attacking, has a 50% chance to strike again in Marine biome or 20% in other biomes. The second hit deals full damage, uses Speed as accuracy, cannot crit, and does not apply effects or gain charge."
    },

    special: {
      id: "phantom-current",
      name: "Phantom Current",
      description:
        "Becomes untargetable this turn. After the opponent acts, strikes with x2 damage using Speed as accuracy.",
      chargeType: "offensive",
      chargeHits: 5
    }
  },

  "tibetan-macaque": {
    id: "tibetan-macaque",
    name: "Tibetan Macaque",
    category: "mammals",

    stats: {
      life: 76,
      attack: 71,
      defense: 77,
      resistance: 73,
      technique: 82,
      speed: 74,
      agility: 79,
      explosiveness: 68
    },

    biomes: {
      favorable: ["mountain", "arctic"],
      neutral: ["forest", "jungle"],
      unfavorable: ["desert", "marine"]
    },

    passive: {
      id: "persistent-harassment",
      name: "Persistent Harassment",
      description:
        "Consecutive hits steal increasing stamina from the opponent (5, 10, 15, up to 30) and store it as loot. Missing resets the chain."
    },

    special: {
      id: "looting-burst",
      name: "Looting Burst",
      description:
        "Deals damage equal to stored loot ×1.5 and resets the loot. Cannot critically strike and cannot miss unless the target is protected.",
      chargeType: "offensive",
      chargeHits: 3
    }
  },

  "iguana": {
    id: "iguana",
    name: "Iguana",
    category: "reptiles",

    stats: {
      life: 84,
      attack: 87,
      defense: 76,
      resistance: 89,
      technique: 68,
      speed: 63,
      agility: 66,
      explosiveness: 67
    },

    biomes: {
      favorable: ["jungle", "marine"],
      neutral: ["forest", "mountain"],
      unfavorable: ["arctic", "desert"]
    },

    passive: {
      id: "suffocating-humidity",
      name: "Suffocating Humidity",
      description:
        "After landing 1 Quick Attack, 1 Precise Attack, and 1 Explosive Attack, Humidity activates for 3 turns. During Humidity, the opponent's attacks cost 5 extra stamina and Iguana restores 20 HP at the end of each turn."
    },

    special: {
      id: "refresh",
      name: "Refresh",
      description:
        "Restores 40 HP and 40 Stamina (80 each during Humidity), and reduces the opponent's Technique and Agility by 20% for 1 turn.",
      chargeType: "offensive",
      chargeHits: 4
    }
  },

  "japanese-fire-bellied-newt": {
    id: "japanese-fire-bellied-newt",
  name: "Japanese-fire-bellied-newt",
  category: "amphibians",

  stats: {
    life: 74,
    attack: 87,
    defense: 66,
    resistance: 71,
    technique: 92,
    speed: 72,
    agility: 75,
    explosiveness: 63
  },

  biomes: {
    favorable: ["forest", "marine"],
    neutral: ["mountain", "jungle"],
    unfavorable: ["desert", "arctic"]
  },

  passive: {
    id: "lethal-precision",
    name: "Lethal Precision",
    description: "Precise attacks ignore 20% defense and gain +10% critical chance."
  },

  special: {
    id: "neurotoxic-injection",
    name: "Neurotoxic Injection (Tetrodotoxin)",
    description: "Uses Technique as precision. Applies -25% evasion, technique and speed (1 turn) and deals 30 damage over time.",
    chargeType: "offensive",
    chargeHits: 4
  }
  },

  "honey-badger": {
  id: "honey-badger",
  name: "Honey Badger",
  category: "mammals",

  stats: {
    life: 82,
    attack: 84,
    defense: 90,
    resistance: 100,
    speed: 56,
    agility: 50,
    technique: 54,
    explosiveness: 84
  },

  biomes: {
    favorable: ["desert", "mountain"],
    neutral: ["forest", "jungle"],
    unfavorable: ["arctic", "marine"]
  },

  passive: {
  id: "savage-endurance",
  name: "Savage Endurance",
  description:
    "Ignores fatigue penalties. When below 25% HP, becomes immune to critical hits and gains +20% Attack and +20% Explosiveness."
},

  special: {
    id: "mutilation",
    name: "Mutilation",
    description:
      "Applies -30% Attack, Speed and Evasion for 2 turns, and blocks Quick Attack.",
    chargeType: "defensive",
    chargeHits: 4
  }
},

"pufferfish": {
  id: "pufferfish",
  name: "Pufferfish",
  category: "fish",

  stats: {
    life: 93,
    attack: 67,
    defense: 91,
    resistance: 87,
    speed: 54,
    agility: 51,
    technique: 72,
    explosiveness: 85
  },

  biomes: {
    favorable: ["marine", "arctic"],
    neutral: ["forest", "jungle"],
    unfavorable: ["mountain", "desert"]
  },

  passive: {
  id: "residual-neurotoxin",
  name: "Residual Neurotoxin",
  description:
    "When using Concentration, if the opponent attacks that turn, the opponent suffers −10% Speed, Technique and Agility on its next turn. Additionally, any direct attack against Pufferfish causes the attacker to suffer 10 fixed damage from its spines."
},

  special: {
    id: "overinflation",
    name: "Overinflation",
    description:
      "Becomes immune to damage for 1 turn. If hit, it takes 25pts dammage and applies Tetrodotoxin: −25% Precision, Agility and Speed on the opponent's next turn. If used twice in a row, explodes for 100 damage and is left at 1 HP.",
    chargeType: "uses",
    maxUses: 4,
    chargeHits: 4
  }
},

"eurasian-eagle-owl": {
  id: "eurasian-eagle-owl",
  name: "Eurasian Eagle-Owl",
  scientificName: "Bubo bubo",
  category: "birds",

  stats: {
    life: 92,
    attack: 78,
    defense: 80,
    resistance: 74,
    speed: 57,
    agility: 70,
    technique: 70,
    explosiveness: 79
  },

  biomes: {
    favorable: ["mountain", "desert"],
    neutral: ["forest", "marine"],
    unfavorable: ["jungle", "arctic"]
  },

  passive: {
    id: "circadian-cycle",
    name: "Circadian Cycle",
    description:
      "Automatically alternates between Day and Night. Day: −50% Attack, +50% Defense, −25% Technique and Agility, and cannot use Special. Night: +50% Attack, +25% Technique and +25% Agility."
  },

  special: {
    id: "nocturnal-hunt",
    name: "Nocturnal Hunt",
    description:
      "Only usable at Night. Attacks with all Night bonuses and heals HP equal to the damage dealt.",
    chargeType: "defensive",
    chargeHits: 4
  }
},

"matamata": {
    id: "matamata",
    name: "Matamata Turtle",
    scientificName: "Chelus fimbriata",
    category: "reptiles",

    stats: {
      life: 90,
      attack: 71,
      defense: 100,
      resistance: 92,
      technique: 76,
      speed: 44,
      agility: 48,
      explosiveness: 79
    },

    biomes: {
      favorable: ["jungle", "marine"],
      neutral: ["forest", "mountain"],
      unfavorable: ["desert", "arctic"]
    },

    passive: {
      id: "immobile-stalk",
      name: "Immobile Stalk",
      description:
        "Each time the opponent uses Concentration, Matamata gains 1 stalk charge. At 4 charges, starting on the next turn, its next attack cannot miss, deals double damage, and absorbs 20 stamina from the opponent."
    },

    special: {
      id: "ancestral-retreat",
      name: "Ancestral Retreat",
      description:
        "Withdraws into its shell, restores 60 HP and 30 stamina. During that turn, the next direct damage received is reduced by 50%, and 25% of the original incoming damage is reflected back to the attacker.",
      chargeType: "defensive",
      chargeHits: 4
    }
  },

"fennec": {
  id: "fennec",
  name: "Fennec",
  category: "mammals",

  stats: {
    life: 63,
    attack: 78,
    defense: 52,
    resistance: 68,
    technique: 94,
    speed: 86,
    agility: 92,
    explosiveness: 67
  },

  biomes: {
    favorable: ["desert", "mountain"],
    neutral: ["forest", "marine"],
    unfavorable: ["arctic", "jungle"]
  },

  passive: {
    id: "thoths-mirage",
    name: "Thoth's Mirage",
    description:
      "Prepares the Oasis by completing 1 successful Quick Attack, 1 successful Explosive Attack, and 2 uses of Concentration. When all requirements are completed, the Fennec unlocks Oasis. Oasis lasts 3 full turns, or 6 full turns if activated while the current biome is Desert."
  },

  special: {
    id: "anubis-staff",
    name: "Anubis' Staff",
    description:
      "Evasive special. Deals x2 damage. Outside Oasis, heals the Fennec for 50% of the damage dealt and steals stamina equal to 25% of the damage dealt. During Oasis, heals for 100% of the damage dealt and steals stamina equal to 50% of the damage dealt.",
    chargeType: "evasive",
    chargeHits: 4
  }
},

"giant-asian-mantis": {
  id: "giant-asian-mantis",
  name: "Giant Asian Mantis",
  category: "arthropods-and-other-invertebrates",
  
  stats: {
    life: 78,
    attack: 87,
    defense: 69,
    resistance: 68,
    technique: 72,
    speed: 74,
    agility: 66,
    explosiveness: 86
  },
  biomes: {
    favorable: ["forest", "jungle"],
    neutral: ["marine", "mountain"],
    unfavorable: ["desert", "arctic"]
  },
  passive: {
    id: "decapitation",
    name: "Decapitation",
    description:
      "After any successful direct hit, if the enemy is at 25% HP or lower, the Giant Asian Mantis has a 20% chance to decapitate the enemy, killing it instantly."
  },
  special: {
    id: "raptorial-chain",
    name: "Raptorial Chain",
    description:
      "Offensive special. Performs up to 5 consecutive strikes. Each strike deals 50% normal damage and rolls accuracy separately. If one strike misses, the chain stops immediately. If at least 3 strikes hit, the enemy suffers -20% Defense for 2 turns. After each successful strike, if the enemy is at 25% HP or lower, Decapitation can trigger.",
    chargeType: "offensive",
    chargeHits: 5
  }
},

"darwins-frog": {
  id: "darwins-frog",
  name: "Darwin's Frog",
  scientificName: "Rhinoderma darwinii",
  category: "amphibians",

  stats: {
    life: 71,
    attack: 70,
    defense: 72,
    resistance: 79,
    technique: 84,
    speed: 75,
    agility: 86,
    explosiveness: 63
  },

  biomes: {
    favorable: ["forest", "jungle"],
    neutral: ["marine", "mountain"],
    unfavorable: ["desert", "arctic"]
  },

  passive: {
    id: "larval-gestation",
    name: "Larval Gestation",
    description:
      "At the end of each turn, Darwin's Frog has a 25% chance to generate 1 larva, up to a maximum of 5 active larvae. Larvae can be used for guaranteed damage, defense, healing, or preserved for future turns."
  },

  special: {
    id: "darwinian-expulsion",
    name: "Darwinian Expulsion",
    description:
      "Generates 1, 2 or 3 larvae instantly. The number of active larvae cannot exceed 5.",
    chargeType: "defensive",
    chargeHits: 4
  }
},

}