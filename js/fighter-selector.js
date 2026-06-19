import { animals } from "./animals.js";

const FAVORITES_STORAGE_KEY = "waft:fighter-favorites:v1";

const CATEGORY_LABELS = {
  mammals: "Mammals",
  birds: "Birds",
  reptiles: "Reptiles",
  amphibians: "Amphibians",
  "fish-and-marine-invertebrates": "Fish / Marine",
  "arthropods-and-other-invertebrates": "Arthropods / Invertebrates"
};

const CATEGORY_ORDER = [
  "mammals",
  "birds",
  "reptiles",
  "amphibians",
  "fish-and-marine-invertebrates",
  "arthropods-and-other-invertebrates"
];

const SORT_OPTIONS = [
  { value: "default", label: "Default roster order" },
  { value: "alphabetical", label: "Alphabetical A-Z" },
  { value: "category", label: "Category" },
  { value: "life", label: "Highest life" },
  { value: "attack", label: "Highest attack" },
  { value: "defense", label: "Highest defense" },
  { value: "resistance", label: "Highest resistance" },
  { value: "technique", label: "Highest technique" },
  { value: "speed", label: "Highest speed" },
  { value: "agility", label: "Highest agility" },
  { value: "explosiveness", label: "Highest explosiveness" }
];

function titleCaseCategory(category) {
  return String(category || "unknown")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getCategoryLabel(category) {
  return CATEGORY_LABELS[category] || titleCaseCategory(category);
}

function getCategoryRank(category) {
  const index = CATEGORY_ORDER.indexOf(category);
  return index === -1 ? 999 : index;
}

function getRosterIds() {
  return Object.keys(animals).filter((fighterId) => {
    const animal = animals[fighterId];
    return animal && animal.name && animal.stats;
  });
}

function readFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) return [];

    return parsed.filter((fighterId) => animals[fighterId]);
  } catch (error) {
    return [];
  }
}

function writeFavorites(favorites) {
  const validFavorites = [...new Set(favorites)].filter((fighterId) => animals[fighterId]);
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(validFavorites));
}

export function getFavoriteFighterIds() {
  return readFavorites();
}

export function isFavoriteFighter(fighterId) {
  return readFavorites().includes(fighterId);
}

export function toggleFavoriteFighter(fighterId) {
  if (!animals[fighterId]) return false;

  const favorites = readFavorites();
  const alreadyFavorite = favorites.includes(fighterId);

  if (alreadyFavorite) {
    writeFavorites(favorites.filter((id) => id !== fighterId));
    return false;
  }

  writeFavorites([...favorites, fighterId]);
  return true;
}

function createOption(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function createOptGroup(label, ids, favoriteIds) {
  const group = document.createElement("optgroup");
  group.label = label;

  ids.forEach((fighterId) => {
    const animal = animals[fighterId];
    const favorite = favoriteIds.includes(fighterId);
    group.appendChild(createOption(fighterId, `${favorite ? "👑 " : ""}${animal.name}`));
  });

  return group;
}

function getCategoryOptions() {
  const categories = [...new Set(getRosterIds().map((fighterId) => animals[fighterId].category || "unknown"))];

  categories.sort((a, b) => {
    const rankA = getCategoryRank(a);
    const rankB = getCategoryRank(b);

    if (rankA !== rankB) return rankA - rankB;
    return getCategoryLabel(a).localeCompare(getCategoryLabel(b));
  });

  return [
    { value: "all", label: "All types" },
    ...categories.map((category) => ({
      value: category,
      label: getCategoryLabel(category)
    }))
  ];
}

function sortFighterIds(ids, sortMode) {
  const sortedIds = [...ids];

  if (sortMode === "alphabetical") {
    sortedIds.sort((a, b) => animals[a].name.localeCompare(animals[b].name));
    return sortedIds;
  }

  if (sortMode === "category") {
    sortedIds.sort((a, b) => {
      const categoryA = animals[a].category || "unknown";
      const categoryB = animals[b].category || "unknown";
      const rankA = getCategoryRank(categoryA);
      const rankB = getCategoryRank(categoryB);

      if (rankA !== rankB) return rankA - rankB;

      const categoryCompare = getCategoryLabel(categoryA).localeCompare(getCategoryLabel(categoryB));
      if (categoryCompare !== 0) return categoryCompare;

      return animals[a].name.localeCompare(animals[b].name);
    });

    return sortedIds;
  }

  const statKeys = ["life", "attack", "defense", "resistance", "technique", "speed", "agility", "explosiveness"];

  if (statKeys.includes(sortMode)) {
    sortedIds.sort((a, b) => {
      const statDifference = (animals[b].stats?.[sortMode] || 0) - (animals[a].stats?.[sortMode] || 0);
      if (statDifference !== 0) return statDifference;
      return animals[a].name.localeCompare(animals[b].name);
    });

    return sortedIds;
  }

  return sortedIds;
}

function getFilteredSortedIds(categoryValue, sortMode) {
  let ids = getRosterIds();

  if (categoryValue && categoryValue !== "all") {
    ids = ids.filter((fighterId) => animals[fighterId].category === categoryValue);
  }

  return sortFighterIds(ids, sortMode || "default");
}

function populateBasicSelect(selectEl, options, preferredValue = "") {
  const currentValue = preferredValue || selectEl.value;
  selectEl.innerHTML = "";

  options.forEach((optionConfig) => {
    selectEl.appendChild(createOption(optionConfig.value, optionConfig.label));
  });

  if (options.some((optionConfig) => optionConfig.value === currentValue)) {
    selectEl.value = currentValue;
  }
}

function updateFavoriteToggle(toggleEl, fighterId) {
  if (!toggleEl) return;

  const favorite = isFavoriteFighter(fighterId);
  toggleEl.checked = favorite;

  const wrapper = toggleEl.closest(".favorite-toggle");
  if (wrapper) {
    wrapper.classList.toggle("active", favorite);
  }
}

function renderFighterSelect(selectEl, categoryEl, sortEl, favoriteToggleEl, preferredValue = "") {
  const previousValue = preferredValue || selectEl.value;
  const categoryValue = categoryEl?.value || "all";
  const sortMode = sortEl?.value || "default";
  const favoriteIds = readFavorites();

  const filteredIds = getFilteredSortedIds(categoryValue, sortMode);
  const favoriteFilteredIds = filteredIds.filter((fighterId) => favoriteIds.includes(fighterId));
  const otherFilteredIds = filteredIds.filter((fighterId) => !favoriteIds.includes(fighterId));

  selectEl.innerHTML = "";

  if (favoriteFilteredIds.length > 0) {
    selectEl.appendChild(createOptGroup("👑 Favorites", favoriteFilteredIds, favoriteIds));
  }

  if (otherFilteredIds.length > 0) {
    selectEl.appendChild(createOptGroup(categoryValue === "all" ? "Fighters" : getCategoryLabel(categoryValue), otherFilteredIds, favoriteIds));
  }

  if (filteredIds.length === 0) {
    const option = createOption("", "No fighters available");
    option.disabled = true;
    selectEl.appendChild(option);
  }

  const nextValue = filteredIds.includes(previousValue) ? previousValue : filteredIds[0];

  if (nextValue) selectEl.value = nextValue;

  updateFavoriteToggle(favoriteToggleEl, selectEl.value);

  return selectEl.value;
}

function refreshLinkedSelectors(linkedSelectors, changedSelectId = null) {
  linkedSelectors.forEach((selectorConfig) => {
    renderFighterSelect(
      selectorConfig.selectEl,
      selectorConfig.categoryEl,
      selectorConfig.sortEl,
      selectorConfig.favoriteToggleEl,
      selectorConfig.selectEl.value
    );

    if (changedSelectId && selectorConfig.selectEl.id !== changedSelectId && typeof selectorConfig.onChange === "function") {
      selectorConfig.onChange(selectorConfig.selectEl.value);
    }
  });
}

export function setupFighterSelector(config) {
  const selectEl = document.getElementById(config.selectId);
  const categoryEl = config.categoryId ? document.getElementById(config.categoryId) : null;
  const sortEl = config.sortId ? document.getElementById(config.sortId) : null;
  const favoriteToggleEl = config.favoriteToggleId ? document.getElementById(config.favoriteToggleId) : null;

  if (!selectEl) {
    console.warn(`Fighter selector not found: ${config.selectId}`);
    return null;
  }

  if (categoryEl) populateBasicSelect(categoryEl, getCategoryOptions(), config.defaultCategory || "all");
  if (sortEl) populateBasicSelect(sortEl, SORT_OPTIONS, config.defaultSort || "default");

  renderFighterSelect(selectEl, categoryEl, sortEl, favoriteToggleEl, config.defaultValue || selectEl.value);

  function notifyChange() {
    updateFavoriteToggle(favoriteToggleEl, selectEl.value);

    if (typeof config.onChange === "function") {
      config.onChange(selectEl.value);
    }
  }

  selectEl.addEventListener("change", notifyChange);

  if (categoryEl) {
    categoryEl.addEventListener("change", () => {
      renderFighterSelect(selectEl, categoryEl, sortEl, favoriteToggleEl, selectEl.value);
      notifyChange();
    });
  }

  if (sortEl) {
    sortEl.addEventListener("change", () => {
      renderFighterSelect(selectEl, categoryEl, sortEl, favoriteToggleEl, selectEl.value);
      notifyChange();
    });
  }

  if (favoriteToggleEl) {
    favoriteToggleEl.addEventListener("change", () => {
      const fighterId = selectEl.value;
      if (!fighterId) return;

      const favorites = readFavorites();
      const shouldBeFavorite = favoriteToggleEl.checked;

      if (shouldBeFavorite && !favorites.includes(fighterId)) writeFavorites([...favorites, fighterId]);
      if (!shouldBeFavorite && favorites.includes(fighterId)) writeFavorites(favorites.filter((id) => id !== fighterId));

      renderFighterSelect(selectEl, categoryEl, sortEl, favoriteToggleEl, fighterId);

      if (typeof config.onChange === "function") {
        config.onChange(selectEl.value);
      }
    });
  }

  return {
    refresh(preferredValue = selectEl.value) {
      return renderFighterSelect(selectEl, categoryEl, sortEl, favoriteToggleEl, preferredValue);
    },
    getValue() {
      return selectEl.value;
    }
  };
}

export function setupLinkedFighterSelectors(configs) {
  const linkedSelectors = [];
  const controllers = [];

  configs.forEach((config) => {
    const selectEl = document.getElementById(config.selectId);
    const categoryEl = config.categoryId ? document.getElementById(config.categoryId) : null;
    const sortEl = config.sortId ? document.getElementById(config.sortId) : null;
    const favoriteToggleEl = config.favoriteToggleId ? document.getElementById(config.favoriteToggleId) : null;

    if (!selectEl) {
      console.warn(`Fighter selector not found: ${config.selectId}`);
      return;
    }

    if (categoryEl) populateBasicSelect(categoryEl, getCategoryOptions(), config.defaultCategory || "all");
    if (sortEl) populateBasicSelect(sortEl, SORT_OPTIONS, config.defaultSort || "default");

    const selectorConfig = {
      selectEl,
      categoryEl,
      sortEl,
      favoriteToggleEl,
      onChange: config.onChange || null
    };

    linkedSelectors.push(selectorConfig);

    renderFighterSelect(selectEl, categoryEl, sortEl, favoriteToggleEl, config.defaultValue || selectEl.value);

    function notifyChange() {
      updateFavoriteToggle(favoriteToggleEl, selectEl.value);

      if (typeof config.onChange === "function") {
        config.onChange(selectEl.value);
      }
    }

    selectEl.addEventListener("change", notifyChange);

    if (categoryEl) {
      categoryEl.addEventListener("change", () => {
        renderFighterSelect(selectEl, categoryEl, sortEl, favoriteToggleEl, selectEl.value);
        notifyChange();
      });
    }

    if (sortEl) {
      sortEl.addEventListener("change", () => {
        renderFighterSelect(selectEl, categoryEl, sortEl, favoriteToggleEl, selectEl.value);
        notifyChange();
      });
    }

    if (favoriteToggleEl) {
      favoriteToggleEl.addEventListener("change", () => {
        const fighterId = selectEl.value;
        if (!fighterId) return;

        const favorites = readFavorites();
        const shouldBeFavorite = favoriteToggleEl.checked;

        if (shouldBeFavorite && !favorites.includes(fighterId)) writeFavorites([...favorites, fighterId]);
        if (!shouldBeFavorite && favorites.includes(fighterId)) writeFavorites(favorites.filter((id) => id !== fighterId));

        refreshLinkedSelectors(linkedSelectors, selectEl.id);

        if (typeof config.onChange === "function") {
          config.onChange(selectEl.value);
        }
      });
    }

    controllers.push({
      refresh(preferredValue = selectEl.value) {
        return renderFighterSelect(selectEl, categoryEl, sortEl, favoriteToggleEl, preferredValue);
      },
      getValue() {
        return selectEl.value;
      }
    });
  });

  return controllers;
}
