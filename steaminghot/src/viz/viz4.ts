import { Game } from "../types";

interface RankingMetric {
  key: string;
  label: string;
  accessor: (game: Game) => number;
  format: (value: number) => string;
}

const METRICS: RankingMetric[] = [
  {
    key: "peak_ccu",
    label: "Peak Concurrent Users",
    accessor: (g) => g.peak_ccu,
    format: (v) => v.toLocaleString(),
  },
  {
    key: "positive",
    label: "Positive Reviews",
    accessor: (g) => g.positive,
    format: (v) => v.toLocaleString(),
  },
  {
    key: "recommendations",
    label: "Recommendations",
    accessor: (g) => g.recommendations,
    format: (v) => v.toLocaleString(),
  },
  {
    key: "positiveRatio",
    label: "Positive Review Ratio",
    accessor: (g) => {
      const total = g.positive + g.negative;
      if (total < 100) return 0; // require at least 100 reviews to avoid noise
      return (g.positive / total) * 100;
    },
    format: (v) => v.toFixed(1) + "%",
  },
  {
    key: "median_playtime",
    label: "Median Playtime",
    accessor: (g) => g.median_playtime_forever,
    format: (v) => Math.round(v / 60) + " hrs",
  },
  {
    key: "average_playtime",
    label: "Avg Playtime",
    accessor: (g) => g.average_playtime_forever,
    format: (v) => Math.round(v / 60) + " hrs",
  },
  {
    key: "price",
    label: "Price",
    accessor: (g) => g.price,
    format: (v) => "$" + v.toFixed(2),
  },
  {
    key: "achievements",
    label: "Achievements",
    accessor: (g) => g.achievements,
    format: (v) => v.toLocaleString(),
  },
  {
    key: "dlc_count",
    label: "DLC Count",
    accessor: (g) => g.dlc_count,
    format: (v) => v.toLocaleString(),
  },
  {
    key: "metacritic",
    label: "Metacritic Score",
    accessor: (g) => g.metacritic_score,
    format: (v) => v.toString(),
  },
  {
    key: "estimated_owners",
    label: "Estimated Owners",
    accessor: (g) => {
      // format: "1000000 - 2000000" — use the lower bound for ranking
      const lower = parseInt(g.estimated_owners.split(" - ")[0].replace(/,/g, ""));
      return isNaN(lower) ? 0 : lower;
    },
    format: (v) => {
      if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M+";
      if (v >= 1_000) return (v / 1_000).toFixed(0) + "K+";
      return v.toLocaleString() + "+";
    },
  },
];

const COLUMN_COLORS = ["#a3a3a3", "#a3a3a3", "#a3a3a3"];
const OVERLAP_2_COLOR = "#bc8dfa";
const OVERLAP_ALL_COLOR = "#7728ac";

function el(tag: string, className?: string, text?: string): HTMLElement {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function initViz4(container: HTMLElement, data: Game[]): void {
  if (data.length === 0) return;

  const years = data
    .map((g) => new Date(g.release_date).getFullYear())
    .filter((y) => !isNaN(y) && y > 1990 && y <= 2025);
  const dataYearMin = Math.min(...years);
  const dataYearMax = Math.max(...years);

  const allGenres = Array.from(new Set(data.flatMap((g) => g.genres))).sort();

  interface ColState {
    id: number;
    metricIdx: number;
  }

  let columns: ColState[] = [
    { id: 0, metricIdx: 0 },
    { id: 1, metricIdx: 1 },
  ];
  let nextColId = 2;
  let topN = 10;
  let filterGenres = new Set<string>();
  let filterYearMin = dataYearMin;
  let filterYearMax = dataYearMax;

  container.innerHTML = "";

  // ── Controls ──────────────────────────────────────────────────────────────
  const controls = el("div", "viz4-controls");

  // Row 1: Top N + Add Ranking
  const row1 = el("div", "viz4-control-row");
  row1.appendChild(el("span", "viz4-label", "Top N:"));

  const topNGroup = el("div", "viz4-btn-group");
  const topNBtns: HTMLButtonElement[] = [];
  [5, 10, 15, 20].forEach((n) => {
    const btn = el("button", "viz4-btn" + (n === topN ? " active" : "")) as HTMLButtonElement;
    btn.textContent = String(n);
    btn.addEventListener("click", () => {
      topN = n;
      topNBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      render();
    });
    topNBtns.push(btn);
    topNGroup.appendChild(btn);
  });
  row1.appendChild(topNGroup);

  const addColBtn = el("button", "viz4-btn viz4-add-col-btn") as HTMLButtonElement;
  addColBtn.textContent = "+ Add Ranking";
  addColBtn.addEventListener("click", () => {
    if (columns.length >= 3) return;
    columns.push({ id: nextColId++, metricIdx: (columns.length * 3) % METRICS.length });
    rebuildColumns();
    syncLegend();
    render();
    syncAddBtn();
  });
  row1.appendChild(addColBtn);
  controls.appendChild(row1);

  // Row 2: Filters
  const row2 = el("div", "viz4-control-row viz4-filters-row");
  row2.appendChild(el("span", "viz4-label", "Filters:"));

  // Genre multi-select dropdown
  const genreWrapper = el("div", "viz4-genre-wrapper");
  const genreToggle = el("button", "viz4-genre-toggle", "Genre (all)") as HTMLButtonElement;
  const genreDropdown = el("div", "viz4-genre-dropdown");
  genreDropdown.style.display = "none";

  const genreClearBtn = el("button", "viz4-genre-clear-btn", "Clear") as HTMLButtonElement;
  genreClearBtn.addEventListener("click", () => {
    filterGenres.clear();
    genreDropdown.querySelectorAll<HTMLInputElement>(".viz4-genre-cb").forEach((cb) => {
      cb.checked = false;
    });
    genreToggle.textContent = "Genre (all)";
    render();
  });
  genreDropdown.appendChild(genreClearBtn);

  allGenres.forEach((genre) => {
    const itemLabel = el("label", "viz4-genre-item") as HTMLLabelElement;
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "viz4-genre-cb";
    cb.addEventListener("change", () => {
      if (cb.checked) filterGenres.add(genre);
      else filterGenres.delete(genre);
      const count = filterGenres.size;
      genreToggle.textContent = count === 0 ? "Genre (all)" : `Genre (${count})`;
      render();
    });
    itemLabel.appendChild(cb);
    itemLabel.appendChild(document.createTextNode(" " + genre));
    genreDropdown.appendChild(itemLabel);
  });

  genreToggle.addEventListener("click", () => {
    const visible = genreDropdown.style.display !== "none";
    genreDropdown.style.display = visible ? "none" : "block";
    genreToggle.classList.toggle("active", !visible);
  });

  // Close genre dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!genreWrapper.contains(e.target as Node)) {
      genreDropdown.style.display = "none";
      genreToggle.classList.remove("active");
    }
  });

  genreWrapper.appendChild(genreToggle);
  genreWrapper.appendChild(genreDropdown);
  row2.appendChild(genreWrapper);

  // Year range
  row2.appendChild(el("span", "viz4-label", "Year:"));
  const yearMinInput = document.createElement("input");
  yearMinInput.type = "number";
  yearMinInput.className = "viz4-year-input";
  yearMinInput.min = String(dataYearMin);
  yearMinInput.max = String(dataYearMax);
  yearMinInput.value = String(filterYearMin);
  yearMinInput.addEventListener("change", () => {
    filterYearMin = parseInt(yearMinInput.value) || dataYearMin;
    render();
  });
  row2.appendChild(yearMinInput);
  row2.appendChild(el("span", "viz4-label", "–"));
  const yearMaxInput = document.createElement("input");
  yearMaxInput.type = "number";
  yearMaxInput.className = "viz4-year-input";
  yearMaxInput.min = String(dataYearMin);
  yearMaxInput.max = String(dataYearMax);
  yearMaxInput.value = String(filterYearMax);
  yearMaxInput.addEventListener("change", () => {
    filterYearMax = parseInt(yearMaxInput.value) || dataYearMax;
    render();
  });
  row2.appendChild(yearMaxInput);
  controls.appendChild(row2);
  container.appendChild(controls);

  // ── Legend ────────────────────────────────────────────────────────────────
  const legend = el("div", "viz4-legend");
  container.appendChild(legend);

  function syncLegend(): void {
    legend.innerHTML = "";
    if (columns.length < 2) return;

    const items =
      columns.length === 2
        ? [{ color: OVERLAP_ALL_COLOR, label: "Appears in both rankings" }]
        : [
            { color: OVERLAP_2_COLOR, label: "Appears in 2 rankings" },
            { color: OVERLAP_ALL_COLOR, label: "Appears in all 3 rankings" },
          ];

    items.forEach(({ color, label }) => {
      const item = el("div", "viz4-legend-item");
      const dot = el("span", "viz4-legend-dot") as HTMLSpanElement;
      dot.style.background = color;
      item.appendChild(dot);
      item.appendChild(document.createTextNode(label));
      legend.appendChild(item);
    });
  }

  // ── Columns container ─────────────────────────────────────────────────────
  const columnsContainer = el("div", "viz4-columns");
  container.appendChild(columnsContainer);

  const listElements = new Map<number, HTMLElement>();

  function rebuildColumns(): void {
    columnsContainer.innerHTML = "";
    listElements.clear();

    columns.forEach((col, idx) => {
      const colEl = el("div", "viz4-column") as HTMLElement;
      colEl.style.borderTopColor = COLUMN_COLORS[idx % COLUMN_COLORS.length];

      const header = el("div", "viz4-column-header");

      const sel = document.createElement("select");
      sel.className = "viz4-metric-select";
      METRICS.forEach((m, i) => {
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = m.label;
        opt.selected = i === col.metricIdx;
        sel.appendChild(opt);
      });
      sel.addEventListener("change", () => {
        col.metricIdx = parseInt(sel.value);
        render();
      });
      header.appendChild(sel);

      if (columns.length > 1) {
        const rmBtn = el("button", "viz4-remove-btn", "✕") as HTMLButtonElement;
        rmBtn.title = "Remove this ranking";
        rmBtn.addEventListener("click", () => {
          columns = columns.filter((c) => c.id !== col.id);
          rebuildColumns();
          syncLegend();
          render();
          syncAddBtn();
        });
        header.appendChild(rmBtn);
      }

      colEl.appendChild(header);

      const list = el("div", "viz4-ranking-list");
      colEl.appendChild(list);
      columnsContainer.appendChild(colEl);
      listElements.set(col.id, list);
    });
  }

  function render(): void {
    const effectiveYearMin = Math.min(filterYearMin, filterYearMax);
    const effectiveYearMax = Math.max(filterYearMin, filterYearMax);

    const filtered = data.filter((g) => {
      const y = new Date(g.release_date).getFullYear();
      if (isNaN(y) || y < effectiveYearMin || y > effectiveYearMax) return false;
      if (filterGenres.size > 0 && ![...filterGenres].every((genre) => g.genres.includes(genre)))
        return false;
      return true;
    });

    const colGames: Game[][] = columns.map((col) => {
      const m = METRICS[col.metricIdx];
      return [...filtered].sort((a, b) => m.accessor(b) - m.accessor(a)).slice(0, topN);
    });

    // Count how many different columns each game appears in
    const idCounts = new Map<string, number>();
    colGames.forEach((games) => {
      const seen = new Set<string>();
      games.forEach((g) => {
        if (!seen.has(g.game_id)) {
          seen.add(g.game_id);
          idCounts.set(g.game_id, (idCounts.get(g.game_id) || 0) + 1);
        }
      });
    });

    columns.forEach((col, idx) => {
      const listEl = listElements.get(col.id);
      if (!listEl) return;
      listEl.innerHTML = "";

      const games = colGames[idx];
      const m = METRICS[col.metricIdx];
      const maxVal = games.length > 0 ? Math.max(m.accessor(games[0]), 1) : 1;

      if (games.length === 0) {
        listEl.appendChild(el("div", "viz4-empty", "No games match the current filters."));
        return;
      }

      games.forEach((game, rank) => {
        const count = idCounts.get(game.game_id) || 1;
        const isOverlap2 = count >= 2 && columns.length > 1;
        const isOverlapAll = count === columns.length && columns.length > 1;

        const row = el("div", "viz4-game-row");
        if (isOverlapAll) row.classList.add("overlap-all");
        else if (isOverlap2) row.classList.add("overlap-2");

        row.appendChild(el("span", "viz4-rank", "#" + (rank + 1)));

        const img = document.createElement("img");
        img.className = "viz4-thumb";
        img.src = game.header_image;
        img.alt = "";
        img.loading = "lazy";
        row.appendChild(img);

        const info = el("div", "viz4-game-info");

        const nameLink = document.createElement("a");
        nameLink.className = "viz4-game-name";
        nameLink.textContent = game.name;
        nameLink.href = `https://store.steampowered.com/app/${game.game_id}`;
        nameLink.target = "_blank";
        nameLink.rel = "noopener noreferrer";
        info.appendChild(nameLink);

        const barRow = el("div", "viz4-bar-row");
        const barContainer = el("div", "viz4-bar-container");
        const barFill = el("div", "viz4-bar-fill") as HTMLElement;
        const pct = (m.accessor(game) / maxVal) * 100;
        barFill.style.width = pct + "%";
        const barColor = isOverlapAll
          ? OVERLAP_ALL_COLOR
          : isOverlap2
            ? OVERLAP_2_COLOR
            : COLUMN_COLORS[idx % COLUMN_COLORS.length];
        barFill.style.background = barColor;
        barContainer.appendChild(barFill);
        barRow.appendChild(barContainer);
        barRow.appendChild(el("span", "viz4-bar-value", m.format(m.accessor(game))));
        info.appendChild(barRow);
        row.appendChild(info);

        if (isOverlap2 && columns.length > 1) {
          const badge = el("span", "viz4-badge", "×" + count) as HTMLSpanElement;
          badge.title = `Appears in ${count} of ${columns.length} rankings`;
          badge.style.background = isOverlapAll ? OVERLAP_ALL_COLOR : OVERLAP_2_COLOR;
          row.appendChild(badge);
        }

        listEl.appendChild(row);
      });
    });
  }

  function syncAddBtn(): void {
    addColBtn.disabled = columns.length >= 3;
    addColBtn.style.opacity = columns.length >= 3 ? "0.4" : "1";
  }

  rebuildColumns();
  syncLegend();
  render();
  syncAddBtn();
}
