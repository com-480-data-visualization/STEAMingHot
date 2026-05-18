import { Game } from "../types";
import _ from "lodash";

type FilterCallback = (
  filterType: string,
  filterValue: string | string[],
) => void;

function createGameCard(game: Game, onFilter: FilterCallback): HTMLElement {
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
  const title = document.createElement("h3");
  title.textContent = game.name;
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
    );
  }
  if (game.publishers.length > 0) {
    addListFieldToSection(
      releaseSection,
      "Publishers",
      game.publishers,
      "publisher",
      onFilter,
    );
  }
  metadataSectionsContainer.appendChild(releaseSection);

  // Community & Reviews section
  const communitySection = createMetadataSection(
    "Community",
    [
      { label: "User Score", value: game.user_score.toFixed(1) },
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
  metadataSectionsContainer.appendChild(communitySection);

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
  metadataSectionsContainer.appendChild(pricingSection);

  // Genres & Categories section
  const genresSection = document.createElement("div");
  genresSection.className = "metadata-section";
  const genresTitle = document.createElement("div");
  genresTitle.className = "metadata-section-title";
  genresTitle.textContent = "Genres & Categories";
  genresSection.appendChild(genresTitle);
  if (game.genres.length > 0) {
    addListFieldToSection(
      genresSection,
      "Genres",
      game.genres,
      "genre",
      onFilter,
    );
  }
  if (game.categories.length > 0) {
    addListFieldToSection(
      genresSection,
      "Categories",
      game.categories,
      "category",
      onFilter,
    );
  }
  metadataSectionsContainer.appendChild(genresSection);

  card.appendChild(metadataSectionsContainer);

  // Tags section
  const tagsSection = document.createElement("div");
  tagsSection.className = "metadata-section";
  const tagsTitle = document.createElement("div");
  tagsTitle.className = "metadata-section-title";
  tagsTitle.textContent = "Player Tags";
  tagsSection.appendChild(tagsTitle);
  const tags = document.createElement("div");
  tags.className = "game-tags";
  Object.keys(game.tags)
    .sort((a, b) => game.tags[b] - game.tags[a])
    .slice(0, 15)
    .forEach((tagName) => {
      const span = document.createElement("span");
      span.textContent = tagName;
      span.addEventListener("click", () => onFilter("tag", tagName));
      tags.appendChild(span);
    });
  tagsSection.appendChild(tags);
  card.appendChild(tagsSection);

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
    itemEl.className = "metadata-list-item";
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
): void {
  container.innerHTML = "";
  container.appendChild(createGameCard(game, onFilter));
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

function filterGamesByType(
  games: Game[],
  filterType: string,
  filterValue: string | string[],
): Game[] {
  if (filterType === "developer") {
    return games.filter((g) => g.developers.includes(filterValue as string));
  } else if (filterType === "publisher") {
    return games.filter((g) => g.publishers.includes(filterValue as string));
  } else if (filterType === "genre") {
    return games.filter((g) => g.genres.includes(filterValue as string));
  } else if (filterType === "category") {
    return games.filter((g) => g.categories.includes(filterValue as string));
  } else if (filterType === "tag") {
    return games.filter((g) => g.tags[filterValue as string]);
  }
  return games;
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

  let currentData = data;

  const handleFilter: FilterCallback = (
    filterType: string,
    filterValue: string | string[],
  ) => {
    const filtered = filterGamesByType(data, filterType, filterValue);
    if (filtered.length > 0) {
      currentData = filtered;
      searchInput.value = "";
      clearSuggestions(suggestionsContainer);
      noResultsContainer.style.display = "none";
      displayGameCard(container, filtered[0], handleFilter);
    }
  };

  displayGameCard(container, initialGame, handleFilter);

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
        currentData = data;
        displayGameCard(container, game, handleFilter);
      });
    }
  });

  const performSearchAndDisplay = () => {
    const query = searchInput.value;
    clearSuggestions(suggestionsContainer);

    const matchedGame = performSearch(query, data);
    if (matchedGame) {
      currentData = data;
      displayGameCard(container, matchedGame, handleFilter);
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
      noResultsContainer.style.display = "none";
      currentData = data;
      displayGameCard(container, initialGame, handleFilter);
    });
  }

  console.log("Viz1 initialized");
}
