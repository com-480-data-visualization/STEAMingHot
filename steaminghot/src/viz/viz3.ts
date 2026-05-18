import { Game } from "../types";
import * as d3 from "d3";

interface GenreYearData {
  year: number;
  genre: string;
  playerCount: number;
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

// Aggregate data by genre and year
function aggregateGenreData(games: Game[]): GenreYearData[] {
  const genreYearMap = new Map<string, Map<number, number>>();

  games.forEach((game) => {
    const year = getYear(game.release_date);
    if (year === 0) return;

    game.genres.forEach((genre) => {
      if (!genreYearMap.has(genre)) {
        genreYearMap.set(genre, new Map());
      }

      const yearMap = genreYearMap.get(genre)!;
      const currentCount = yearMap.get(year) || 0;

      const estimatedOwners = extractPlayerCount(game.estimated_owners); // Use estimated_owners as proxy for player count
      yearMap.set(year, currentCount + estimatedOwners);
    });
  });

  const result: GenreYearData[] = [];
  genreYearMap.forEach((yearMap, genre) => {
    yearMap.forEach((playerCount, year) => {
      result.push({ year, genre, playerCount });
    });
  });

  return result;
}

export function initViz3(container: HTMLElement, data: Game[]): void {
  console.log("=== initViz3 called ===");
  console.log("Data received:", data.length, "games");

  if (!data || data.length === 0) {
    container.innerHTML = "<p>No data available</p>";
    return;
  }

  const aggregatedData = aggregateGenreData(data);
  console.log("Aggregated data:", aggregatedData.length, "entries");

  if (aggregatedData.length === 0) {
    console.error("No aggregated data!");
    container.innerHTML = "<p>No aggregated data</p>";
    return;
  }

  const minYear = 2010;
  const maxYear = 2024;
  const filteredData = aggregatedData.filter(
    (d) => d.year >= minYear && d.year <= maxYear
  );

  console.log("Filtered data:", filteredData.length, "entries");

  if (filteredData.length === 0) {
    console.warn("No data in year range 2010-2024");
    container.innerHTML = "<p>No data in year range 2010-2024</p>";
    return;
  }

  const years = Array.from(new Set(filteredData.map((d) => d.year))).sort(
    (a, b) => a - b
  );

  console.log("Years:", years);

  const genres = Array.from(new Set(filteredData.map((d) => d.genre))); // Create color scale for genres
  console.log("Genres:", genres);

  const colorScale = d3.scaleOrdinal<string>()
    .domain(genres)
    .range(d3.schemeCategory10);

  const width = Math.max(container.clientWidth || 1000, 800);
  const height = 600;
  const margin = { top: 80, right: 50, bottom: 50, left: 200 };

  // Transition duration for smoother anims (increase for slower)
  const transitionDuration = 2000;

  container.innerHTML = "";

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

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = String(years[0]);
  slider.max = String(years[years.length - 1]);
  slider.step = "1";
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

  const yearToIndex = new Map<number, number>(years.map((year, idx) => [year, idx]));
  function findClosestYearIndex(yearValue: number): number {
    if (yearToIndex.has(yearValue)) {
      return yearToIndex.get(yearValue)!;
    }
    let closestIndex = 0;
    let closestDiff = Infinity;
    years.forEach((year, idx) => {
      const diff = Math.abs(year - yearValue);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = idx;
      }
    });
    return closestIndex;
  }
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
    .style("background", "#f9f9f9")
    .style("border", "1px solid #ccc")
    .style("display", "block");

  console.log("SVG created");

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const xScale = d3.scaleLinear().range([0, plotWidth]);
  const yScale = d3
    .scaleBand<string>()
    .range([0, plotHeight])
    .padding(0.1);

  const xAxis = d3.axisTop(xScale);
  const yAxis = d3.axisLeft(yScale);
  const xAxisGroup = g.append("g").attr("class", "x-axis");
  const yAxisGroup = g.append("g").attr("class", "y-axis");

  const yearText = svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", 40)
    .attr("font-size", "32px")
    .attr("font-weight", "bold")
    .attr("text-anchor", "middle")
    .attr("fill", "#333");

  const barsGroup = g.append("g").attr("class", "bars");

  // animation function
  function update(yearIndex: number, immediate = false) {
    const currentYear = years[yearIndex];
    const yearData = filteredData.filter((d) => d.year === currentYear);

    if (yearData.length === 0) {
      console.warn("No data for year", currentYear);
      return;
    }

    slider.value = String(currentYear);
    yearDisplay.textContent = String(currentYear);
    yearText.text(String(currentYear));
    const sortedData = yearData.sort(
      (a, b) => b.playerCount - a.playerCount
    );

    const maxPlayers = d3.max(sortedData, (d) => d.playerCount) || 1;
    xScale.domain([0, maxPlayers]);
    yScale.domain(sortedData.map((d) => d.genre));
    const duration = immediate ? 0 : transitionDuration;
    xAxisGroup.transition().duration(duration).call(xAxis);
    yAxisGroup.transition().duration(duration).call(yAxis);

    const bars = barsGroup
      .selectAll<SVGRectElement, GenreYearData>("rect")
      .data(sortedData, (d) => d.genre);

    bars.exit().remove();

    bars
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("fill", (d) => colorScale(d.genre))
      .attr("height", yScale.bandwidth())
      .attr("width", 0)
      .merge(bars)
      .transition()
      .duration(duration)
      .ease(d3.easeQuadInOut)
      .attr("y", (d) => yScale(d.genre) || 0)
      .attr("x", 0)
      .attr("width", (d) => xScale(d.playerCount))
      .attr("height", yScale.bandwidth());
  }

  console.log("Initializing with first year:", years[0]);
  update(0, true);

  // Auto-play animation variables
  let currentYearIndex = 0;
  let animationInterval: number | null = null;
  let isUserInteracting = false;

  function startAutoPlay() {
    if (animationInterval) clearInterval(animationInterval);
    currentYearIndex = 0;
    animationInterval = setInterval(() => {
      if (currentYearIndex < years.length - 1) {
        currentYearIndex++;
        update(currentYearIndex);
      } else {
        // Loop back to beginning 
        currentYearIndex = 0;
        update(currentYearIndex);
      }
    }, transitionDuration + 300) as unknown as number;
  }

  slider.addEventListener("input", (e) => {
    isUserInteracting = true;
    if (animationInterval) {
      clearInterval(animationInterval);
      animationInterval = null;
    }
    const value = parseInt((e.target as HTMLInputElement).value);
    const index = findClosestYearIndex(value);
    currentYearIndex = index;
    update(index);
  });

  let userInteractionTimeout: number | null = null;
  slider.addEventListener("change", () => {
    if (userInteractionTimeout) clearTimeout(userInteractionTimeout);
    userInteractionTimeout = setTimeout(() => {
      isUserInteracting = false;
      startAutoPlay();
    }, 2000) as unknown as number;
  });

  // Add playback controls
  const controlsDiv = document.createElement("div");
  controlsDiv.style.marginTop = "15px";
  controlsDiv.style.display = "flex";
  controlsDiv.style.gap = "10px";
  controlsDiv.style.alignItems = "center";

  const playBtn = document.createElement("button");
  playBtn.textContent = "▶ Play";
  playBtn.style.padding = "10px 20px";
  playBtn.style.background = "#8429ca";
  playBtn.style.color = "white";
  playBtn.style.border = "none";
  playBtn.style.borderRadius = "6px";
  playBtn.style.cursor = "pointer";
  playBtn.style.fontWeight = "bold";
  playBtn.style.fontSize = "14px";
  playBtn.style.transition = "background 0.2s";
  playBtn.onmouseover = () => (playBtn.style.background = "#a940e0");
  playBtn.onmouseout = () => (playBtn.style.background = "#8429ca");
  playBtn.onclick = () => {
    console.log("Play clicked");
    if (userInteractionTimeout) clearTimeout(userInteractionTimeout);
    startAutoPlay();
  };

  const pauseBtn = document.createElement("button");
  pauseBtn.textContent = "⏸ Pause";
  pauseBtn.style.padding = "10px 20px";
  pauseBtn.style.background = "#8429ca";
  pauseBtn.style.color = "white";
  pauseBtn.style.border = "none";
  pauseBtn.style.borderRadius = "6px";
  pauseBtn.style.cursor = "pointer";
  pauseBtn.style.fontWeight = "bold";
  pauseBtn.style.fontSize = "14px";
  pauseBtn.style.transition = "background 0.2s";
  pauseBtn.onmouseover = () => (pauseBtn.style.background = "#a940e0");
  pauseBtn.onmouseout = () => (pauseBtn.style.background = "#8429ca");
  pauseBtn.onclick = () => {
    console.log("Pause clicked");
    if (animationInterval) clearInterval(animationInterval);
    animationInterval = null;
  };

  controlsDiv.appendChild(playBtn);
  controlsDiv.appendChild(pauseBtn);
  container.appendChild(controlsDiv);

  startAutoPlay(); // on load

  console.log("=== initViz3 complete ===");
}

