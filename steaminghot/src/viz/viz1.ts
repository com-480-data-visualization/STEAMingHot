import { Game } from "../types";
import _ from "lodash";

function createGameCard(game: Game): HTMLElement {
  // create the container for the game card
  const card = document.createElement("div");
  card.className = "single-game-card";

  // create the cover image element
  const coverImg = document.createElement("img");
  coverImg.className = "game-cover";
  coverImg.src = game.header_image;
  coverImg.alt = game.name + " cover art";

  // add the game's title
  const title = document.createElement("h3");
  title.textContent = game.name;

  // add the game's description
  const description = document.createElement("p");
  description.className = "game-description";
  description.textContent = game.short_description;

  // various metadata about the game
  const metadata = document.createElement("div");
  metadata.className = "game-metadata";

  const positiveRatio = (
    (game.positive / (game.positive + game.negative)) *
    100
  ).toFixed(2);

  const metadataFields = [
    { label: "Release Date", value: game.release_date },
    { label: "Required Age", value: game.required_age.toString() },
    { label: "Price", value: "$" + game.price.toFixed(2) },
    { label: "Genres", value: game.genres.join(", ") },
    { label: "Positive Reviews", value: game.positive.toLocaleString() },
    { label: "Negative Reviews", value: game.negative.toLocaleString() },
    { label: "Positive Review Ratio", value: positiveRatio + "%" },
    { label: "Estimated Owners", value: game.estimated_owners },
    {
      label: "Peak CCU (Concurrent Users)",
      value: game.peak_ccu.toLocaleString(),
    },
  ];

  metadataFields.forEach((field) => {
    const p = document.createElement("p");
    const span = document.createElement("span");
    span.textContent = field.label + ":";
    p.appendChild(span);
    p.appendChild(document.createTextNode(" " + field.value));
    metadata.appendChild(p);
  });

  // game tags
  const tags = document.createElement("div");
  tags.className = "game-tags";
  Object.keys(game.tags)
    .sort((a, b) => game.tags[b] - game.tags[a])
    .slice(0, 20)
    .forEach((tagName) => {
      const span = document.createElement("span");
      span.textContent = tagName;
      tags.appendChild(span);
    });

  // add all elements to the card
  card.appendChild(coverImg);
  card.appendChild(title);
  card.appendChild(description);
  card.appendChild(metadata);
  card.appendChild(tags);

  return card;
}

function displayGameCard(container: HTMLElement, game: Game): void {
  container.innerHTML = "";
  container.appendChild(createGameCard(game));
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
    !searchClear ||
    !suggestionsContainer ||
    !noResultsContainer
  ) {
    console.error("Search UI elements not found");
    return;
  }

  displayGameCard(container, initialGame);

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
        displayGameCard(container, game);
      });
    }
  });

  const performSearchAndDisplay = () => {
    const query = searchInput.value;
    clearSuggestions(suggestionsContainer);

    const matchedGame = performSearch(query, data);
    if (matchedGame) {
      displayGameCard(container, matchedGame);
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

  console.log("Viz1 initialized");
}
