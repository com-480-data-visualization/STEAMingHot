import { Game } from "../types";
import * as d3 from "d3";

interface GenreYearData {
  year: number;
  genre: string;
  metricValue: number;
}

// Helper function to extract year from release date
function getYear(dateStr: string): number {
  try {
    return new Date(dateStr).getFullYear();
  } catch {
    return 0;
  }
}

// Extract and parse estimated_owners value from range string
// e.g., "100000-200000" -> 150000 (midpoint), "1000000-2000000" -> 1500000
function extractPlayerCount(estOwnersStr: string): number {
  if (!estOwnersStr || estOwnersStr.trim() === "") return 0;

  const numbers = estOwnersStr.match(/\d+/g);
  
  if (!numbers || numbers.length === 0) return 0;

  if (numbers.length >= 2) {
    const lower = parseInt(numbers[0]);
    const upper = parseInt(numbers[1]);
    return Math.floor((lower + upper) / 2);
  }

  return parseInt(numbers[0]);
}

// Aggregate data by label and year
function aggregateLabelData(
  games: Game[],
  labelAccessor: (game: Game) => string[],
  valueAccessor: (game: Game) => number
): GenreYearData[] {
  const labelYearMap = new Map<string, Map<number, number>>();

  games.forEach((game) => {
    const year = getYear(game.release_date);
    if (year === 0) return;

    labelAccessor(game).forEach((label) => {
      if (!labelYearMap.has(label)) {
        labelYearMap.set(label, new Map());
      }

      const yearMap = labelYearMap.get(label)!;
      const currentValue = yearMap.get(year) || 0;
      const metricValue = valueAccessor(game);
      yearMap.set(year, currentValue + metricValue);
    });
  });

  const result: GenreYearData[] = [];
  labelYearMap.forEach((yearMap, label) => {
    yearMap.forEach((metricValue, year) => {
      result.push({ year, genre: label, metricValue });
    });
  });

  return result;
}

function buildLabelYearMap(data: GenreYearData[]): Map<string, Map<number, number>> {
  const map = new Map<string, Map<number, number>>();
  data.forEach((entry) => {
    if (!map.has(entry.genre)) {
      map.set(entry.genre, new Map());
    }
    map.get(entry.genre)!.set(entry.year, entry.metricValue);
  });
  return map;
}

export function initViz3(container: HTMLElement, data: Game[]): void {
  console.log("=== initViz3 called ===");
  console.log("Data received:", data.length, "games");

  if (!data || data.length === 0) {
    container.innerHTML = "<p>No data available</p>";
    return;
  }

  const minYear = 2010;
  const maxYear = 2025;

  const aggregationModes = [
    { label: "Year Only", isCumulative: false },
    { label: "Cumulative", isCumulative: true },
  ];

  const propertyOptions = [
    {
      label: "Number of Releases",
      extractor: (game: Game) => 1,
    },
  ];

  let selectedAggregationMode = aggregationModes[0];

  function convertToCumulative(data: GenreYearData[]): GenreYearData[] {
    const cumulativeMap = new Map<string, number>();
    const sortedData = [...data].sort((a, b) => a.year - b.year);
    const result: GenreYearData[] = [];
    sortedData.forEach((entry) => {
      const key = entry.genre;
      const currentSum = cumulativeMap.get(key) || 0;
      const newSum = currentSum + entry.metricValue;
      cumulativeMap.set(key, newSum);
      result.push({ year: entry.year, genre: entry.genre, metricValue: newSum });
    });
    return result;
  }

  let selectedProperty = propertyOptions[0];
  let aggregatedData = aggregateLabelData(data, (game: Game) => game.genres, selectedProperty.extractor);
  if (selectedAggregationMode.isCumulative) {
    aggregatedData = convertToCumulative(aggregatedData);
  }
  let filteredData = aggregatedData.filter(
    (d) => d.year >= minYear && d.year <= maxYear
  );

  if (filteredData.length === 0) {
    console.warn("No data in year range 2010-2025");
    container.innerHTML = "<p>No data in year range 2010-2025</p>";
    return;
  }

  let genreYearMap = buildLabelYearMap(filteredData);
  let maxMetricOverall = d3.max(filteredData, (d) => d.metricValue) || 1;
  let years = Array.from(new Set(filteredData.map((d) => d.year))).sort(
    (a, b) => a - b
  );
  console.log("Years:", years);

  let genres = Array.from(new Set(filteredData.map((d) => d.genre))); // Create color scale for genres
  console.log("Genres:", genres);

  function interpolateYearData(yearValue: number): GenreYearData[] {
    const lower = Math.floor(yearValue);
    const upper = Math.ceil(yearValue);
    const t = yearValue - lower;

    return genres.map((genre) => {
      const yearMap = genreYearMap.get(genre)!;
      const lowerValue = yearMap.get(lower) || 0;
      const upperValue = yearMap.get(upper) || 0;
      const metricValue = lower === upper ? lowerValue : lowerValue + (upperValue - lowerValue) * t;
      return { year: yearValue, genre, metricValue };
    });
  }

  let colorScale = d3.scaleOrdinal<string>()
    .domain(genres)
    .range(d3.schemeCategory10);

  const maxGenresToShow = 10;
  const width = Math.max(container.clientWidth || 1000, 800);
  const height = 600;
  const margin = { top: 80, right: 50, bottom: 50, left: 200 };

  container.innerHTML = "";

  const propertyContainer = document.createElement("div");
  propertyContainer.style.marginBottom = "12px";
  propertyContainer.style.display = "flex";
  propertyContainer.style.alignItems = "center";
  propertyContainer.style.gap = "12px";
  propertyContainer.style.padding = "10px 15px";
  propertyContainer.style.background = "#f5f5f5";
  propertyContainer.style.borderRadius = "8px";
  propertyContainer.style.maxWidth = "520px";

  const viewTitle = document.createElement("span");
  viewTitle.textContent = "Genre Releases - ";
  viewTitle.style.fontWeight = "bold";
  viewTitle.style.fontSize = "14px";
  viewTitle.style.color = "#8429ca";

  const aggregationLabel = document.createElement("label");
  aggregationLabel.textContent = "Mode:";
  aggregationLabel.style.fontWeight = "bold";
  aggregationLabel.style.minWidth = "50px";
  aggregationLabel.style.color = "#8429ca";

  const aggregationSelect = document.createElement("select");
  aggregationSelect.style.flex = "1";
  aggregationSelect.style.padding = "8px 10px";
  aggregationSelect.style.border = "1px solid #ccc";
  aggregationSelect.style.borderRadius = "6px";
  aggregationSelect.style.background = "#fff";
  aggregationSelect.style.color = "#000";
  aggregationSelect.style.cursor = "pointer";

  aggregationModes.forEach((option, index) => {
    const opt = document.createElement("option");
    opt.value = String(index);
    opt.text = option.label;
    aggregationSelect.appendChild(opt);
  });

  propertyContainer.appendChild(viewTitle);
  propertyContainer.appendChild(aggregationLabel);
  propertyContainer.appendChild(aggregationSelect);
  container.appendChild(propertyContainer);

  // slider
  const sliderContainer = document.createElement("div");
  sliderContainer.style.marginBottom = "20px";
  sliderContainer.style.display = "flex";
  sliderContainer.style.alignItems = "center";
  sliderContainer.style.gap = "15px";
  sliderContainer.style.padding = "15px";
  sliderContainer.style.background = "#f5f5f5";
  sliderContainer.style.borderRadius = "8px";
  sliderContainer.style.maxWidth = "520px";

  const sliderLabel = document.createElement("label");
  sliderLabel.textContent = "Year:";
  sliderLabel.style.fontWeight = "bold";
  sliderLabel.style.minWidth = "50px";
  sliderLabel.style.color = "#8429ca";

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = String(years[0]);
  slider.max = String(years[years.length - 1]);
  slider.step = "0.01";
  slider.value = String(years[0]);
  slider.style.width = "100%";
  slider.style.cursor = "pointer";
  slider.style.height = "8px";
  slider.style.borderRadius = "4px";
  slider.style.background = "#ddd";

  const yearDisplay = document.createElement("span");
  yearDisplay.textContent = String(years[0]);
  yearDisplay.style.minWidth = "60px";
  yearDisplay.style.fontWeight = "bold";

  yearDisplay.style.fontSize = "16px";
  yearDisplay.style.color = "#8429ca";

  sliderContainer.appendChild(sliderLabel);
  sliderContainer.appendChild(slider);
  sliderContainer.appendChild(yearDisplay);
  container.appendChild(sliderContainer);

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("background", "#000")
    .style("border", "2px solid #fff")
    .style("display", "block");

  console.log("SVG created");

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const xScale = d3.scaleLinear().range([0, plotWidth]).domain([0, maxMetricOverall]);
  const yScale = d3
    .scaleBand<string>()
    .range([0, plotHeight])
    .padding(0.24);

  const xAxis = d3.axisTop(xScale);
  const yAxis = d3.axisLeft(yScale).tickSize(0).tickFormat(() => "");
  const xAxisGroup = g.append("g").attr("class", "x-axis");
  const yAxisGroup = g.append("g").attr("class", "y-axis");

  xAxisGroup.call(xAxis).selectAll("text").attr("fill", "#fff");
  xAxisGroup.selectAll("path, line").attr("stroke", "#fff");
  yAxisGroup.call(yAxis);
  yAxisGroup.selectAll("path, line").attr("stroke", "#fff");

  function refreshChartData(): void {
    aggregatedData = aggregateLabelData(data, (game: Game) => game.genres, selectedProperty.extractor);
    if (selectedAggregationMode.isCumulative) {
      aggregatedData = convertToCumulative(aggregatedData);
    }
    filteredData = aggregatedData.filter((d) => d.year >= minYear && d.year <= maxYear);
    if (filteredData.length === 0) {
      console.warn("No data in year range 2010-2025");
      return;
    }
    genreYearMap = buildLabelYearMap(filteredData);
    maxMetricOverall = d3.max(filteredData, (d) => d.metricValue) || 1;
    years = Array.from(new Set(filteredData.map((d) => d.year))).sort((a, b) => a - b);
    genres = Array.from(new Set(filteredData.map((d) => d.genre)));
    colorScale.domain(genres);
    xScale.domain([0, maxMetricOverall]);
    slider.min = String(years[0]);
    slider.max = String(years[years.length - 1]);
    if (currentYear < years[0] || currentYear > years[years.length - 1]) {
      currentYear = years[0];
    }
  }

  const yearText = svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", 40)
    .attr("font-size", "32px")
    .attr("font-weight", "bold")
    .attr("text-anchor", "middle")
    .attr("fill", "#fff");

  const barsGroup = g.append("g").attr("class", "bars");
  const labelsGroup = g.append("g").attr("class", "bar-labels");

  // animation function
  function update(yearValue: number) {
    const clampedYear = Math.max(minYear, Math.min(maxYear, yearValue));
    const currentData = interpolateYearData(clampedYear);
    const sortedData = currentData.sort((a, b) => b.metricValue - a.metricValue);
    const displayedData = sortedData.slice(0, maxGenresToShow);
    const displayYear = Math.round(clampedYear);

    slider.value = String(clampedYear.toFixed(2));
    yearDisplay.textContent = String(displayYear);
    yearText.text(String(displayYear));

    yScale.domain(displayedData.map((d) => d.genre));
    yAxisGroup
      .transition()
      .duration(500)
      .call(yAxis);
    yAxisGroup.selectAll("path, line").attr("stroke", "#fff");

    const bars = barsGroup
      .selectAll<SVGRectElement, GenreYearData>("rect")
      .data(displayedData, (d) => d.genre);

    bars.exit().remove();

    const enteringBars = bars
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("fill", (d) => colorScale(d.genre))
      .attr("height", yScale.bandwidth())
      .attr("x", 0)
      .attr("y", (d) => yScale(d.genre) || 0)
      .attr("width", 0);

    enteringBars
      .merge(bars as d3.Selection<SVGRectElement, GenreYearData, SVGGElement, unknown>)
      .transition()
      .duration(500)
      .ease(d3.easeLinear)
      .attr("height", yScale.bandwidth())
      .attr("y", (d) => yScale(d.genre) || 0)
      .attr("x", 0)
      .attr("width", (d) => xScale(d.metricValue));

    const labels = labelsGroup
      .selectAll<SVGTextElement, GenreYearData>("text")
      .data(displayedData, (d) => d.genre);

    labels.exit().remove();

    const enteringLabels = labels
      .enter()
      .append("text")
      .attr("fill", "#fff")
      .attr("font-size", "12px")
      .attr("alignment-baseline", "middle")
      .attr("text-anchor", "end")
      .attr("x", -10)
      .attr("y", (d) => (yScale(d.genre) || 0) + yScale.bandwidth() / 2)
      .text((d) => d.genre);

    enteringLabels
      .merge(labels as d3.Selection<SVGTextElement, GenreYearData, SVGGElement, unknown>)
      .transition()
      .duration(500)
      .ease(d3.easeLinear)
      .attr("x", -10)
      .attr("y", (d) => (yScale(d.genre) || 0) + yScale.bandwidth() / 2)
      .text((d) => d.genre);
  }

  console.log("Initializing with first year:", years[0]);
  let currentYear = years[0];
  let animationTimer: d3.Timer | null = null;
  let isUserInteracting = false;
  const yearSpeed = 1.0; // continuous years per second
  let lastTimestamp = Date.now();

  function startAutoPlay() {
    if (animationTimer) {
      animationTimer.stop();
    }
    isUserInteracting = false;
    lastTimestamp = Date.now();
    animationTimer = d3.timer(() => {
      const now = Date.now();
      const dt = now - lastTimestamp;
      lastTimestamp = now;
      currentYear += (dt / 1000) * yearSpeed;
      if (currentYear > maxYear) {
        currentYear = minYear + (currentYear - maxYear);
      }
      update(currentYear);
    });
  }

  slider.addEventListener("input", (e) => {
    isUserInteracting = true;
    if (animationTimer) {
      animationTimer.stop();
      animationTimer = null;
    }
    isPlaying = false;
    toggleBtn.textContent = "▶ Play";
    const value = parseFloat((e.target as HTMLInputElement).value);
    currentYear = value;
    update(currentYear);
  });

  let userInteractionTimeout: number | null = null;
  slider.addEventListener("change", () => {
    if (userInteractionTimeout) clearTimeout(userInteractionTimeout);
    userInteractionTimeout = window.setTimeout(() => {
      if (!isUserInteracting) {
        startAutoPlay();
      }
    }, 2000);
  });

  aggregationSelect.addEventListener("change", () => {
    selectedAggregationMode = aggregationModes[aggregationSelect.selectedIndex];
    aggregatedData = aggregateLabelData(data, (game: Game) => game.genres, selectedProperty.extractor);
    if (selectedAggregationMode.isCumulative) {
      aggregatedData = convertToCumulative(aggregatedData);
    }
    filteredData = aggregatedData.filter((d) => d.year >= minYear && d.year <= maxYear);
    if (filteredData.length === 0) {
      console.warn("No data in year range 2010-2025");
      return;
    }
    genreYearMap = buildLabelYearMap(filteredData);
    maxMetricOverall = d3.max(filteredData, (d) => d.metricValue) || 1;
    years = Array.from(new Set(filteredData.map((d) => d.year))).sort((a, b) => a - b);
    genres = Array.from(new Set(filteredData.map((d) => d.genre)));
    colorScale.domain(genres);
    xScale.domain([0, maxMetricOverall]);
    slider.min = String(years[0]);
    slider.max = String(years[years.length - 1]);
    if (currentYear < years[0] || currentYear > years[years.length - 1]) {
      currentYear = years[0];
    }
    xAxisGroup.call(xAxis).selectAll("text").attr("fill", "#fff");
    xAxisGroup.selectAll("path, line").attr("stroke", "#fff");
    update(currentYear);
  });

  // Add playback controls
  const controlsDiv = document.createElement("div");
  controlsDiv.style.marginTop = "15px";
  controlsDiv.style.display = "flex";
  controlsDiv.style.gap = "10px";
  controlsDiv.style.alignItems = "center";

  let isPlaying = false;

  const toggleBtn = document.createElement("button");
  toggleBtn.textContent = "▶ Play";
  toggleBtn.style.padding = "10px 20px";
  toggleBtn.style.background = "#8429ca";
  toggleBtn.style.color = "white";
  toggleBtn.style.border = "none";
  toggleBtn.style.borderRadius = "6px";
  toggleBtn.style.cursor = "pointer";
  toggleBtn.style.fontWeight = "bold";
  toggleBtn.style.fontSize = "14px";
  toggleBtn.style.transition = "background 0.2s";
  toggleBtn.onmouseover = () => (toggleBtn.style.background = "#a940e0");
  toggleBtn.onmouseout = () => (toggleBtn.style.background = "#8429ca");
  toggleBtn.onclick = () => {
    if (isPlaying) {
      // Pause
      console.log("Pause clicked");
      if (animationTimer) {
        animationTimer.stop();
        animationTimer = null;
      }
      isPlaying = false;
      toggleBtn.textContent = "▶ Play";
    } else {
      // Play
      console.log("Play clicked");
      if (userInteractionTimeout) clearTimeout(userInteractionTimeout);
      startAutoPlay();
      isPlaying = true;
      toggleBtn.textContent = "⏸ Pause";
    }
  };

  controlsDiv.appendChild(toggleBtn);
  container.appendChild(controlsDiv);

  startAutoPlay(); // on load
  isPlaying = true;
  toggleBtn.textContent = "⏸ Pause";

  console.log("=== initViz3 complete ===");
}

