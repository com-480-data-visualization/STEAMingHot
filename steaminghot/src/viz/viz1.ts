import { Game } from "../types";
import _ from "lodash";

type FilterCallback = (
  filterType: string,
  filterValue: string | string[],
) => void;

type ActiveFilter = { type: string; value: string };

function createGameCard(
  game: Game,
  onFilter: FilterCallback,
  activeFilters: ActiveFilter[],
): HTMLElement {
  const card = document.createElement("div");
  card.className = "single-game-card";

  // Top row with image, name and description
  const topRow = document.createElement("div");
  topRow.className = "game-card-top-row";

  // top row left: cover image
  const imageSection = document.createElement("div");
  imageSection.className = "game-card-image-section";
  const coverImg = document.createElement("img");
  coverImg.className = "game-cover";
  coverImg.src = game.header_image;
  coverImg.alt = game.name + " cover art";
  imageSection.appendChild(coverImg);

  // top row right: header with name and description
  const header = document.createElement("div");
  header.className = "game-card-header";

  // title with link to store page
  const title = document.createElement("h3");
  const titleLink = document.createElement("a");
  titleLink.textContent = game.name;
  titleLink.href = `https://store.steampowered.com/app/${game.game_id}`;
  titleLink.target = "_blank";
  titleLink.rel = "noopener noreferrer";
  titleLink.style.color = "inherit";
  title.appendChild(titleLink);

  const description = document.createElement("p");
  description.className = "game-description";
  description.textContent = game.short_description;
  header.appendChild(title);
  header.appendChild(description);

  topRow.appendChild(imageSection);
  topRow.appendChild(header);
  card.appendChild(topRow);

  // Metadata sections grid
  const metadataSectionsContainer = document.createElement("div");
  metadataSectionsContainer.className = "game-metadata-sections";

  // Release Details section
  const releaseSection = createMetadataSection(
    "Release Details",
    [
      { label: "Release Date", value: game.release_date },
      { label: "Age Rating", value: game.required_age.toString() },
    ],
    onFilter,
  );
  if (game.developers.length > 0) {
    addListFieldToSection(
      releaseSection,
      "Developers",
      game.developers,
      "developer",
      onFilter,
      activeFilters,
    );
  }
  if (game.publishers.length > 0) {
    addListFieldToSection(
      releaseSection,
      "Publishers",
      game.publishers,
      "publisher",
      onFilter,
      activeFilters,
    );
  }
  // Pricing & Content section
  const pricingSection = createMetadataSection(
    "Pricing & Content",
    [
      { label: "Price", value: "$" + game.price.toFixed(2) },
      { label: "DLC Count", value: game.dlc_count.toString() },
      { label: "Achievements", value: game.achievements.toString() },
    ],
    onFilter,
  );

  const leftCol = document.createElement("div");
  leftCol.className = "metadata-col metadata-col-left";
  leftCol.appendChild(releaseSection);
  leftCol.appendChild(pricingSection);
  metadataSectionsContainer.appendChild(leftCol);

  // Community & Reviews section
  const communitySection = createMetadataSection(
    "Community",
    [
      { label: "Positive Reviews", value: game.positive.toLocaleString() },
      { label: "Negative Reviews", value: game.negative.toLocaleString() },
      {
        label: "Positive Ratio",
        value:
          ((game.positive / (game.positive + game.negative)) * 100).toFixed(1) +
          "%",
      },
      { label: "Peak Players", value: game.peak_ccu.toLocaleString() },
      {
        label: "Median Playtime",
        value: game.median_playtime_forever + " hours",
      },
      {
        label: "Recommendations",
        value: game.recommendations.toLocaleString(),
      },
    ],
    onFilter,
  );

  // Genres & Categories section
  const genresSection = document.createElement("div");
  genresSection.className = "metadata-section";
  const genresTitle = document.createElement("div");
  genresTitle.className = "metadata-section-title";
  genresTitle.textContent = "Genres & Tags";
  genresSection.appendChild(genresTitle);
  if (game.genres.length > 0) {
    addListFieldToSection(
      genresSection,
      "Genres",
      game.genres,
      "genre",
      onFilter,
      activeFilters,
    );
  }
  const topTags = Object.keys(game.tags)
    .sort((a, b) => game.tags[b] - game.tags[a])
    .slice(0, 15);
  if (topTags.length > 0) {
    addListFieldToSection(
      genresSection,
      "Player Tags",
      topTags,
      "tag",
      onFilter,
      activeFilters,
    );
  }

  const rightCol = document.createElement("div");
  rightCol.className = "metadata-col metadata-col-right";
  rightCol.appendChild(communitySection);
  rightCol.appendChild(genresSection);
  metadataSectionsContainer.appendChild(rightCol);

  card.appendChild(metadataSectionsContainer);

  return card;
}

function createMetadataSection(
  title: string,
  fields: { label: string; value: string }[],
  onFilter: FilterCallback,
): HTMLElement {
  const section = document.createElement("div");
  section.className = "metadata-section";
  const sectionTitle = document.createElement("div");
  sectionTitle.className = "metadata-section-title";
  sectionTitle.textContent = title;
  section.appendChild(sectionTitle);

  fields.forEach((field) => {
    const fieldEl = document.createElement("div");
    fieldEl.className = "metadata-field";
    const label = document.createElement("span");
    label.className = "metadata-field label";
    label.textContent = field.label;
    const value = document.createElement("span");
    value.className = "metadata-value";
    value.textContent = field.value;
    fieldEl.appendChild(label);
    fieldEl.appendChild(value);
    section.appendChild(fieldEl);
  });

  return section;
}

function addListFieldToSection(
  section: HTMLElement,
  fieldLabel: string,
  items: string[],
  filterType: string,
  onFilter: FilterCallback,
  activeFilters: ActiveFilter[],
): void {
  const fieldEl = document.createElement("div");
  fieldEl.className = "metadata-field";
  const label = document.createElement("span");
  label.className = "metadata-field label";
  label.textContent = fieldLabel;
  fieldEl.appendChild(label);
  section.appendChild(fieldEl);

  const listContainer = document.createElement("div");
  listContainer.className = "metadata-list";
  items.forEach((item) => {
    const itemEl = document.createElement("div");
    const isActive = activeFilters.some(
      (f) => f.type === filterType && f.value === item,
    );
    itemEl.className = "metadata-list-item" + (isActive ? " active" : "");
    itemEl.textContent = item;
    itemEl.addEventListener("click", () => onFilter(filterType, item));
    listContainer.appendChild(itemEl);
  });
  section.appendChild(listContainer);
}

function displayGameCard(
  container: HTMLElement,
  game: Game,
  onFilter: FilterCallback,
  activeFilters: ActiveFilter[],
): void {
  container.innerHTML = "";
  container.appendChild(createGameCard(game, onFilter, activeFilters));
}

function searchGamesByName(
  query: string,
  allGames: Game[],
  limit: number = 10,
): Game[] {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return [];

  return allGames
    .filter((game) => game.name.toLowerCase().includes(lowerQuery))
    .slice(0, limit);
}

function performSearch(query: string, allGames: Game[]): Game | null {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return null;

  const exactMatch = allGames.find(
    (game) => game.name.toLowerCase() === lowerQuery,
  );
  if (exactMatch) return exactMatch;

  const startsWithMatch = allGames.find((game) =>
    game.name.toLowerCase().startsWith(lowerQuery),
  );
  if (startsWithMatch) return startsWithMatch;

  const containsMatch = allGames.find((game) =>
    game.name.toLowerCase().includes(lowerQuery),
  );
  return containsMatch || null;
}

function renderSuggestions(
  container: HTMLElement,
  games: Game[],
  onSelect: (game: Game) => void,
): void {
  container.innerHTML = "";
  if (games.length === 0) return;

  games.forEach((game) => {
    const item = document.createElement("div");
    item.className = "search-suggestion-item";
    item.textContent = game.name;
    item.style.cursor = "pointer";
    item.addEventListener("click", () => onSelect(game));
    container.appendChild(item);
  });
}

function clearSuggestions(container: HTMLElement): void {
  container.innerHTML = "";
}

function filterGamesByActiveFilters(
  games: Game[],
  filters: ActiveFilter[],
): Game[] {
  return games.filter((game) =>
    filters.every(({ type, value }) => {
      if (type === "developer") return game.developers.includes(value);
      if (type === "publisher") return game.publishers.includes(value);
      if (type === "genre") return game.genres.includes(value);
      if (type === "tag") return !!game.tags[value];
      return true;
    }),
  );
}

function renderFilteredGamesList(
  listContainer: HTMLElement,
  games: Game[],
  activeFilters: ActiveFilter[],
  onSelect: (game: Game) => void,
  onClearFilters: () => void,
): void {
  listContainer.innerHTML = "";
  if (activeFilters.length === 0) return;

  const top50 = [...games]
    .sort((a, b) => b.peak_ccu - a.peak_ccu)
    .slice(0, 50);

  const header = document.createElement("div");
  header.className = "filter-list-header";

  const headerText = document.createElement("span");
  headerText.textContent =
    top50.length > 0
      ? "Other popular games matching your filters"
      : "No games match all selected filters";
  header.appendChild(headerText);

  const clearBtn = document.createElement("button");
  clearBtn.className = "filter-list-clear-btn";
  clearBtn.title = "Clear all filters";
  clearBtn.textContent = "✕";
  clearBtn.addEventListener("click", onClearFilters);
  header.appendChild(clearBtn);

  listContainer.appendChild(header);

  if (top50.length === 0) return;

  const itemsContainer = document.createElement("div");
  listContainer.appendChild(itemsContainer);
  renderSuggestions(itemsContainer, top50, onSelect);
}

export function initViz1(container: HTMLElement, data: Game[]): void {
  if (data.length === 0) {
    console.log("No game data available");
    return;
  }

  // sort games by peak ccu
  const sortedByPeakCCU = [...data].sort((a, b) => b.peak_ccu - a.peak_ccu);
  const initialGame = sortedByPeakCCU[0];

  const searchInput = document.querySelector<HTMLInputElement>(".search-input");
  const searchButton =
    document.querySelector<HTMLButtonElement>(".search-button");
  const searchClear =
    document.querySelector<HTMLButtonElement>(".search-clear");
  const suggestionsContainer = document.querySelector<HTMLElement>(
    ".search-suggestions",
  );
  const noResultsContainer =
    document.querySelector<HTMLElement>(".search-no-results");

  if (
    !searchInput ||
    !searchButton ||
    !suggestionsContainer ||
    !noResultsContainer
  ) {
    console.error("Search UI elements not found");
    return;
  }

  const filterListContainer = document.createElement("div");
  filterListContainer.className = "filter-games-list";
  container.parentElement?.insertBefore(
    filterListContainer,
    container.nextSibling,
  );

  let activeFilters: ActiveFilter[] = [];
  let currentGame = initialGame;

  const refreshCard = () => {
    displayGameCard(container, currentGame, handleFilter, activeFilters);
  };

  const clearFilters = () => {
    activeFilters = [];
    filterListContainer.innerHTML = "";
    refreshCard();
  };

  const refreshList = () => {
    const filtered = filterGamesByActiveFilters(data, activeFilters);
    renderFilteredGamesList(
      filterListContainer,
      filtered,
      activeFilters,
      (game) => {
        activeFilters = [];
        filterListContainer.innerHTML = "";
        currentGame = game;
        refreshCard();
        container.scrollIntoView({ behavior: "smooth" });
      },
      clearFilters,
    );
  };

  const handleFilter: FilterCallback = (filterType, filterValue) => {
    const value = filterValue as string;
    const idx = activeFilters.findIndex(
      (f) => f.type === filterType && f.value === value,
    );
    if (idx >= 0) {
      activeFilters.splice(idx, 1);
    } else {
      activeFilters.push({ type: filterType, value });
    }
    refreshCard();
    refreshList();
  };

  displayGameCard(container, initialGame, handleFilter, activeFilters);

  searchInput.addEventListener("input", () => {
    const query = searchInput.value;
    noResultsContainer.style.display = "none";

    if (!query.trim()) {
      clearSuggestions(suggestionsContainer);
      return;
    }

    const suggestions = searchGamesByName(query, data);
    if (suggestions.length === 0) {
      clearSuggestions(suggestionsContainer);
    } else {
      renderSuggestions(suggestionsContainer, suggestions, (game) => {
        searchInput.value = game.name;
        clearSuggestions(suggestionsContainer);
        activeFilters = [];
        filterListContainer.innerHTML = "";
        currentGame = game;
        refreshCard();
      });
    }
  });

  const performSearchAndDisplay = () => {
    const query = searchInput.value;
    clearSuggestions(suggestionsContainer);

    const matchedGame = performSearch(query, data);
    if (matchedGame) {
      activeFilters = [];
      filterListContainer.innerHTML = "";
      currentGame = matchedGame;
      refreshCard();
      searchInput.value = matchedGame.name;
      noResultsContainer.style.display = "none";
    } else {
      noResultsContainer.textContent = `No games found for "${query}"`;
      noResultsContainer.style.display = "block";
      container.innerHTML = "";
    }
  };

  searchButton.addEventListener("click", performSearchAndDisplay);
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      performSearchAndDisplay();
    }
  });

  if (searchClear) {
    searchClear.addEventListener("click", () => {
      searchInput.value = "";
      clearSuggestions(suggestionsContainer);
      activeFilters = [];
      filterListContainer.innerHTML = "";
      noResultsContainer.style.display = "none";
      currentGame = initialGame;
      refreshCard();
    });
  }

  console.log("Viz1 initialized");
}