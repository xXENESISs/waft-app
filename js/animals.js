export const animals = {
  "sumatran-tiger": {
    id: "sumatran-tiger",
    name: "Sumatran Tiger",
    category: "mammals",

    stats: {
      life: 72,
      attack: 88,
      defense: 76,
      resistance: 72,
      technique: 75,
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
      id: "silent-stalk",
      name: "Silent Stalk",
      description:
        "If the Sumatran Tiger ends a turn without taking direct damage, it gains 1 Stalk stack, up to 4. Each stack grants +5% Attack, +10% Speed and +10% Explosiveness. Taking direct damage removes 1 Stalk stack. Missing an attack removes all Stalk stacks."
    },

    special: {
      id: "throat-bite",
      name: "Throat Bite",
      description:
        "With 0–2 Stalk stacks, ignores 50% Defense and applies Bleed for 2 turns. With 3 or more Stalk stacks, consumes all Stalk stacks, ignores 100% Defense and applies Deep Bleed for 2 turns.",
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
      agility: 100,
      explosiveness: 45
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
        "Reflects 50% of direct damage received this turn and only takes the remaining 50%. If the opponent misses or uses Concentration, Shima Enaga's next successful attack deals x3 total damage. Missing does not consume this buff.",
      chargeType: "reactive",
      chargeHits: 3
    }
  },

  "mantis-shrimp": {
    id: "mantis-shrimp",
    name: "Mantis Shrimp",
    category: "fish-and-marine-invertebrates",

    stats: {
      life: 67,
      attack: 89,
      defense: 63,
      resistance: 66,
      technique: 71,
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
      chargeHits: 5
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
        "Each successful attack grants 1 Hunting Inertia stack, up to 4. Each stack grants +5% damage and +10% Explosiveness. Missing an attack removes all stacks."
    },

    special: {
      id: "deadly-dive",
      name: "Deadly Dive",
      description:
        "The Falcon takes flight, capping the opponent's accuracy against it at 25% this turn, then dives. On hit, deals direct damage and reduces the opponent's stamina by 50% of the final damage dealt. The Falcon does not recover stamina from this effect. Does not consume Hunting Inertia stacks on hit. Missing removes all Hunting Inertia stacks.",
      chargeType: "offensive",
      chargeHits: 4
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
        "Restores 40 HP and 40 Stamina (80 each during Humidity), and reduces the opponent's Technique and Agility by 20% for 1 turn. During Humidity, the debuff becomes -40% Technique and Agility for 2 turns.",
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
  category: "fish-and-marine-invertebrates",

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
  },

  mechanicsPreview: {
    title: "Special Mechanics / Commands",
    subtitle: "Darwin's Frog is a larva-resource fighter. Its extra command only makes sense if you understand larvae before choosing it.",
    sections: [
      {
        icon: "🐸",
        title: "Larval Gestation",
        lines: [
          "At the end of each turn, Darwin's Frog has a 25% chance to generate 1 larva.",
          "Maximum: 5 active larvae."
        ]
      },
      {
        icon: "🧬",
        title: "Larval Command",
        lines: [
          "Attack: spends larvae for guaranteed damage.",
          "Defend: larvae can block incoming damage.",
          "Sacrifice: converts larvae into HP / stamina recovery.",
          "Meditate: preserves resources for a later turn."
        ]
      },
      {
        icon: "🌋",
        title: "Darwinian Expulsion",
        lines: [
          "Special: instantly generates 1, 2 or 3 larvae.",
          "Cannot exceed the 5-larva cap."
        ]
      }
    ]
  }
},


"three-toed-sloth": {
  id: "three-toed-sloth",
  name: "Three-Toed Sloth",
  scientificName: "Bradypus tridactylus",
  category: "mammals",

  stats: {
    life: 91,
    attack: 79,
    defense: 86,
    resistance: 88,
    technique: 83,
    speed: 42,
    agility: 47,
    explosiveness: 89
  },

  biomes: {
    favorable: ["jungle", "forest"],
    neutral: ["marine", "mountain"],
    unfavorable: ["arctic", "desert"]
  },

  passive: {
    id: "living-ecosystem",
    name: "Living Ecosystem",
    description:
      "The Three-Toed Sloth hosts five symbiotic colonies. At the start of combat, 2 random colonies awaken. Whenever the biome changes, active colonies and colony progress reset, then 2 new colonies awaken. In Arctic and Desert, the ecosystem becomes dormant: no colonies awaken and Microecosystem Ancestral cannot be used. Colonies: Algae can restore 30 HP and 15 Stamina at turn end; Fungi can invert stat debuffs; Bacteria scales consecutive attacks; Mites reduce attack stamina costs; Lichens double the other active colony, or all colonies during Microecosystem Ancestral."
  },

  special: {
    id: "ancestral-microecosystem",
    name: "Microecosystem Ancestral",
    description:
      "Can only be used in favorable or neutral biomes. Activates all 5 colonies for 3 turns, counting the activation turn, and immediately performs an explosive attack that can hit, miss or crit normally. During this state, colonies do not change even if the biome changes and colony progress is preserved. When it ends, the ecosystem follows the current biome again and colony progress resets.",
    chargeType: "defensive",
    chargeHits: 4
  },

  mechanicsPreview: {
    title: "Living Ecosystem / Colonies",
    subtitle: "The Three-Toed Sloth is a biome-dependent ecosystem fighter. The exact active colonies are random, but the whole system is visible before combat.",
    sections: [
      {
        icon: "🌍",
        title: "Biome Rule",
        lines: [
          "At battle start, 2 random colonies awaken.",
          "Whenever the biome changes, active colonies and colony progress reset.",
          "Arctic and Desert put the ecosystem into dormancy: no colonies awaken and Microecosystem Ancestral cannot be used."
        ]
      },
      {
        icon: "🟢",
        title: "Algae Colony",
        lines: [
          "At the end of each turn, has a chance to restore HP and stamina."
        ]
      },
      {
        icon: "🍄",
        title: "Fungal Colony",
        lines: [
          "Can invert numerical stat debuffs.",
          "Does not invert bleed, poison, self-hit, stun, special lock or other non-stat states."
        ]
      },
      {
        icon: "🦠",
        title: "Bacterial Colony",
        lines: [
          "Consecutive successful attacks build a damage chain.",
          "The chain scales up to a strong boosted hit, then discharges and resets.",
          "Using Concentration does not break the chain. Missing or being dodged does."
        ]
      },
      {
        icon: "🕷️",
        title: "Mite Colony",
        lines: [
          "Attacks cost less stamina.",
          "Basic attacks can drop to 0 stamina cost."
        ]
      },
      {
        icon: "🪨",
        title: "Lichen Colony",
        lines: [
          "Amplifies the other active colony.",
          "During Microecosystem Ancestral, amplifies the full ecosystem."
        ]
      },
      {
        icon: "🌳",
        title: "Microecosystem Ancestral",
        lines: [
          "Special: activates all 5 colonies for 3 turns.",
          "Immediately performs an explosive attack.",
          "Colonies stay active during the special even if the biome changes."
        ]
      }
    ]
  }
},


"coconut-octopus": {
  id: "coconut-octopus",
  name: "Coconut Octopus",
  scientificName: "Amphioctopus marginatus",
  category: "fish-and-marine-invertebrates",

  stats: {
    life: 70,
    attack: 80,
    defense: 80,
    resistance: 70,
    technique: 95,
    speed: 65,
    agility: 80,
    explosiveness: 60
  },

  biomes: {
    favorable: ["marine", "jungle"],
    neutral: ["forest", "mountain"],
    unfavorable: ["arctic", "desert"]
  },

  passive: {
    id: "cephalopod-adaptation",
    name: "Cephalopod Adaptation",
    description:
      "The Coconut Octopus has 8 adaptation charges per combat. During the Stand Phase, it can transform into Offensive, Defensive, Evasive or Base Form without consuming its action or turn. The first transformation does not consume a charge. Leaving a form removes that form's passive stacks."
  },

  special: {
    id: "perfect-adaptation",
    name: "Perfect Adaptation",
    description:
      "Uses a balanced version of Tentacle Storm, Coconut Fortress or Ink Sea using Base Form stats. It does not consume transformation, does not change form and does not consume adaptation charges.",
    chargeType: "offensive",
    chargeHits: 4
  },

  mechanicsPreview: {
    title: "Adaptation Forms / Commands",
    subtitle: "The Coconut Octopus is a stance fighter. You need to know its forms before choosing it or fighting against it.",
    sections: [
      {
        icon: "🐙",
        title: "Cephalopod Adaptation",
        lines: [
          "8 adaptation charges per combat.",
          "First transformation is free.",
          "Transformation happens before the action and does not consume the turn. Returning to Base Form is also a transformation.",
          "Leaving a form clears that form's accumulated stacks."
        ]
      },
      {
        icon: "⚔️",
        title: "Offensive Form",
        lines: [
          "Attack 100 / Defense 20 / Technique 25 / Agility 20 / Explosiveness 150.",
          "Low defense and low agility.",
          "Predatory Pressure: successful hits reduce enemy Attack by 5%, up to 40%.",
          "Special: Tentacle Storm — 8 independent hits at 30% accuracy."
        ]
      },
      {
        icon: "🥥",
        title: "Defensive Form",
        lines: [
          "High defense and survival.",
          "Coconut Shell: attacker takes 10 fixed damage when directly hitting it.",
          "Special: Coconut Fortress — incoming damage becomes 0 and restores 50 HP / 50 stamina."
        ]
      },
      {
        icon: "🌫️",
        title: "Evasive Form",
        lines: [
          "Very high agility.",
          "Perfect Camouflage: when the enemy misses, restores 15 HP and 15 stamina.",
          "Special: Ink Sea — enemy suffers -50% Speed and -50% Technique for 3 turns."
        ]
      },
      {
        icon: "🌊",
        title: "Base Special: Perfect Adaptation",
        lines: [
          "In Base Form, Special lets you choose a balanced version of Tentacle Storm, Coconut Fortress or Ink Sea.",
          "It does not transform and does not spend adaptation charges."
        ]
      }
    ]
  },

  octopusForms: {
    base: {
      id: "base",
      name: "Base Form",
      stats: {
        life: 70,
        attack: 80,
        defense: 80,
        resistance: 70,
        technique: 95,
        speed: 65,
        agility: 80,
        explosiveness: 60
      },
      passive: {
        id: "cephalopod-adaptation",
        name: "Cephalopod Adaptation",
        description:
          "The Coconut Octopus has 8 adaptation charges per combat. During the Stand Phase, it can transform into Offensive, Defensive, Evasive or Base Form without consuming its action or turn. The first transformation does not consume a charge. Leaving a form removes that form's passive stacks."
      },
      special: {
        id: "perfect-adaptation",
        name: "Perfect Adaptation",
        description:
          "Uses a balanced version of Tentacle Storm, Coconut Fortress or Ink Sea using Base Form stats. It does not consume transformation, does not change form and does not consume adaptation charges.",
        chargeType: "offensive",
        chargeHits: 4
      }
    },

    offensive: {
      id: "offensive",
      name: "Offensive Form",
      stats: {
        life: 70,
        attack: 100,
        defense: 20,
        resistance: 70,
        technique: 25,
        speed: 85,
        agility: 20,
        explosiveness: 150
      },
      passive: {
        id: "predatory-pressure",
        name: "Predatory Pressure",
        description:
          "Each successful hit reduces enemy Attack by 5%, up to 40%. Special hits can also apply stacks. Leaving Offensive Form removes all stacks immediately."
      },
      special: {
        id: "tentacle-storm",
        name: "Tentacle Storm",
        description:
          "The Coconut Octopus strikes with all eight arms: 8 independent hits, each with 30% accuracy. Each hit uses current Attack and Explosiveness. Charges separately from the other forms.",
        chargeType: "offensive",
        chargeHits: 6
      }
    },

    defensive: {
      id: "defensive",
      name: "Defensive Form",
      stats: {
        life: 70,
        attack: 60,
        defense: 120,
        resistance: 70,
        technique: 95,
        speed: 65,
        agility: 80,
        explosiveness: 40
      },
      passive: {
        id: "coconut-shell",
        name: "Coconut Shell",
        description:
          "Each time the Coconut Octopus receives a direct hit, the attacker takes 10 fixed damage."
      },
      special: {
        id: "coconut-fortress",
        name: "Coconut Fortress",
        description:
          "The Coconut Octopus hides completely inside its refuge. This turn, all received damage is reduced to 0. It restores 50 HP and 50 Stamina. Charges separately from the other forms.",
        chargeType: "defensive",
        chargeHits: 5
      }
    },

    evasive: {
      id: "evasive",
      name: "Evasive Form",
      stats: {
        life: 70,
        attack: 40,
        defense: 40,
        resistance: 70,
        technique: 95,
        speed: 95,
        agility: 150,
        explosiveness: 40
      },
      passive: {
        id: "perfect-camouflage",
        name: "Perfect Camouflage",
        description:
          "Each time an enemy attack misses, the Coconut Octopus restores 15 HP and 15 Stamina."
      },
      special: {
        id: "ink-sea",
        name: "Ink Sea",
        description:
          "Releases a massive cloud of ink. The enemy suffers -50% Speed and -50% Technique for 3 turns. The effect remains even if the Coconut Octopus later changes form. Charges separately from the other forms.",
        chargeType: "evasive",
        chargeHits: 4
      }
    }
  }
},


"iberian-ribbed-newt": {
  id: "iberian-ribbed-newt",
  name: "Iberian Ribbed Newt",
  scientificName: "Pleurodeles waltl",
  category: "amphibians",

  stats: {
    life: 93,
    attack: 65,
    defense: 92,
    resistance: 82,
    speed: 56,
    agility: 54,
    technique: 79,
    explosiveness: 79
  },

  biomes: {
    favorable: ["forest", "jungle"],
    neutral: ["mountain", "desert"],
    unfavorable: ["marine", "arctic"]
  },

  passive: {
    id: "ribbed-guard",
    name: "Ribbed Guard",
    description:
      "Offensive actions targeting the Iberian Ribbed Newt cost 5 extra Stamina. While Costal Eversion is active, offensive actions targeting it cost 10 extra Stamina total."
  },

  special: {
    id: "costal-eversion",
    name: "Costal Eversion",
    description:
      "Defensive special. The Iberian Ribbed Newt loses 50 HP and exposes its toxin-covered ribs for 3 turns, including the activation turn. While active, it receives 50% less damage, reflects 25% of the original incoming direct damage, and direct attackers suffer Costal Toxin until Costal Eversion ends. At the end of the next 2 active turns, it restores 25 HP.",
    chargeType: "defensive",
    chargeHits: 4
  }
},


"iberian-skink": {
  id: "iberian-skink",
  name: "Iberian Skink",
  scientificName: "Chalcides bedriagai",
  category: "reptiles",

  stats: {
    life: 88,
    attack: 66,
    defense: 90,
    resistance: 84,
    speed: 68,
    agility: 62,
    technique: 72,
    explosiveness: 70
  },

  biomes: {
    favorable: ["desert", "forest"],
    neutral: ["mountain", "marine"],
    unfavorable: ["jungle", "arctic"]
  },

  passive: {
    id: "scaled-retreat",
    name: "Scaled Retreat",
    description:
      "If the opponent uses an offensive action while the Iberian Skink uses Concentration and the attack hits, the Iberian Skink restores double HP from Concentration. Stamina restored by Concentration is not doubled."
  },

  special: {
    id: "caudal-autotomy",
    name: "Caudal Autotomy",
    description:
      "Defensive special. The Iberian Skink sheds its tail, immediately loses 90 HP, and creates a detached tail with 90 HP for 3 turns, including the activation turn. While the tail is active, direct attacks targeting the Iberian Skink hit the tail instead. At the end of each active turn, the Iberian Skink restores 30 HP. After the third turn, the tail regenerates and disappears.",
    chargeType: "defensive",
    chargeHits: 4
  }
},
}