import * as d3 from "d3";
import { Game, Viz2Row, Viz2RowKey, Viz2Dimension } from "../types";

type AnyScale =
  | d3.ScaleLinear<number, number>
  | d3.ScaleLogarithmic<number, number>;

const MARGIN = { top: 72, right: 60, bottom: 80, left: 60 };
const MIN_REVIEWS = 50;
const MAX_PRICE = 400;
const PREVIEW_LIMIT = 300;

const DIMS: Viz2Dimension[] = [
  { key: "price", label: "Price ($)", log: false },
  { key: "positiveRatio", label: "Positive Ratio (%)", log: false },
  { key: "totalReviews", label: "Total Reviews", log: true },
  { key: "medianPlaytime", label: "Median Playtime (h)", log: true },
  { key: "peakCcu", label: "Peak Concurrent Users (CCU)", log: true },
  { key: "achievements", label: "Achievement Count", log: true },
  { key: "dlcCount", label: "DLC Count", log: true },
];

function toRow(g: Game): Viz2Row {
  const total = g.positive + g.negative;
  return {
    name: g.name,
    color: "",
    yValues: [],
    path: new Path2D(),
    tags: Object.keys(g.tags),
    price: g.price,
    positiveRatio: (g.positive / total) * 100,
    totalReviews: total,
    medianPlaytime: g.median_playtime_forever / 60,
    peakCcu: g.peak_ccu,
    achievements: g.achievements,
    dlcCount: g.dlc_count,
  };
}

function buildYScales(rows: Viz2Row[], h: number): Map<Viz2RowKey, AnyScale> {
  const scales = new Map<Viz2RowKey, AnyScale>();
  for (const { key, log } of DIMS) {
    const vals = rows
      .map((r) => r[key])
      .filter((v) => isFinite(v) && v > (log ? 0 : -Infinity));
    const lo = log ? Math.max(1, d3.min(vals)!) : d3.min(vals)!;
    const hi = d3.max(vals)!;
    scales.set(
      key,
      log
        ? d3.scaleLog().domain([lo, hi]).range([h, 0]).clamp(true)
        : d3.scaleLinear().domain([lo, hi]).range([h, 0]),
    );
  }
  return scales;
}

export function initViz2(container: HTMLElement, data: Game[]): void {
  const rows = data
    .filter(
      (g) => g.positive + g.negative >= MIN_REVIEWS && g.price <= MAX_PRICE,
    )
    .map(toRow);

  // genre dropdown
  const allTags = [...new Set(data.flatMap((g) => Object.keys(g.tags)))].sort();
  const genreWrapper = document.createElement("div");
  genreWrapper.className = "viz2-genre-wrapper";
  genreWrapper.style.paddingRight = `${MARGIN.right}px`;
  const tagSelect = document.createElement("select");
  tagSelect.className = "viz2-tag-select";
  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "All tags";
  tagSelect.appendChild(defaultOpt);
  allTags.forEach((genre) => {
    const opt = document.createElement("option");
    opt.value = genre;
    opt.textContent = genre;
    tagSelect.appendChild(opt);
  });
  genreWrapper.appendChild(tagSelect);
  container.parentElement?.insertBefore(genreWrapper, container);

  const totalW = container.clientWidth || 960;
  const totalH = 520;
  const w = totalW - MARGIN.left - MARGIN.right;
  const h = totalH - MARGIN.top - MARGIN.bottom;

  d3.select(container)
    .style("position", "relative")
    .style("height", `${totalH}px`);

  const canvas = d3
    .select(container)
    .append("canvas")
    .attr("width", totalW)
    .attr("height", totalH)
    .style("position", "absolute")
    .node() as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", totalW)
    .attr("height", totalH)
    .style("position", "absolute")
    .append("g")
    .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

  const xScale = d3
    .scalePoint<string>()
    .domain(DIMS.map((d) => d.key))
    .range([0, w])
    .padding(0.1);

  const dims = DIMS.map((d) => ({ ...d, x: xScale(d.key)! }));
  const yScales = buildYScales(rows, h);
  const colorOf = d3.scaleSequential(d3.interpolateRdYlGn).domain([0, 1]);

  for (const row of rows) {
    row.color = colorOf(row.positiveRatio / 100);
    row.yValues = dims.map(({ key, log }) =>
      (yScales.get(key)! as (v: number) => number)(
        log ? Math.max(1, row[key]) : row[key],
      ),
    );
    const path = new Path2D();
    dims.forEach(({ x }, i) =>
      i === 0 ? path.moveTo(x, row.yValues[i]) : path.lineTo(x, row.yValues[i]),
    );
    row.path = path;
  }

  const selectedIntervals = new Map<Viz2RowKey, [number, number] | null>(
    DIMS.map((d) => [d.key, null]),
  );

  function isSelected(row: Viz2Row): boolean {
    for (let i = 0; i < DIMS.length; i++) {
      const interval = selectedIntervals.get(DIMS[i].key);
      if (!interval) continue;
      const y = row.yValues[i];
      // d3.brushY always yields [y_top, y_bottom] so interval[0] < interval[1]
      if (y < interval[0] || y > interval[1]) return false;
    }
    return true;
  }

  let selectedTag: string | null = null;

  function visibleGameRows(limit: number | null): Viz2Row[] {
    const source = selectedTag
      ? rows.filter((r) => r.tags.includes(selectedTag!))
      : rows;
    const anyInterval = [...selectedIntervals.values()].some(Boolean);
    if (!anyInterval) return limit !== null ? source.slice(0, limit) : source;
    const result: Viz2Row[] = [];
    for (const row of source) {
      if (!isSelected(row)) continue;
      result.push(row);
      if (limit !== null && result.length >= limit) break;
    }
    return result;
  }

  // Offscreen canvases: built once per filter change, reused for every redraw.
  let offNormal: OffscreenCanvas | null = null;
  let offDimmed: OffscreenCanvas | null = null;
  // Cached visible set for hit-testing (kept in sync with offscreen canvases).
  let cachedVisible: Viz2Row[] = [];
  let batchClearing = false;

  // Fast draw: just blit the pre-built offscreen.
  // During brush preview, fall back to a limited direct draw.
  function draw(previewLimit?: number) {
    if (batchClearing) return;
    ctx.clearRect(0, 0, totalW, totalH);
    if (previewLimit !== undefined) {
      ctx.save();
      ctx.translate(MARGIN.left, MARGIN.top);
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1.2;
      for (const row of visibleGameRows(previewLimit)) {
        ctx.strokeStyle = row.color;
        ctx.stroke(row.path);
      }
      ctx.restore();
    } else if (offNormal) {
      ctx.drawImage(offNormal, 0, 0);
    }
  }

  // O(1) hover redraw: blit dimmed offscreen then stroke the single highlighted line.
  function drawHover(hovered: Viz2Row) {
    ctx.clearRect(0, 0, totalW, totalH);
    if (offDimmed) ctx.drawImage(offDimmed, 0, 0);
    ctx.save();
    ctx.translate(MARGIN.left, MARGIN.top);
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = hovered.color;
    ctx.stroke(hovered.path);
    ctx.restore();
  }

  // Build both offscreen canvases in one synchronous pass so all lines appear at once.
  function rebuildAndDraw() {
    if (batchClearing) return;
    cachedVisible = visibleGameRows(null);

    const oc1 = new OffscreenCanvas(totalW, totalH);
    const n = oc1.getContext("2d")!;
    n.save();
    n.translate(MARGIN.left, MARGIN.top);
    n.globalAlpha = 0.35;
    n.lineWidth = 1.2;

    const oc2 = new OffscreenCanvas(totalW, totalH);
    const d = oc2.getContext("2d")!;
    d.save();
    d.translate(MARGIN.left, MARGIN.top);
    d.globalAlpha = 0.08;
    d.lineWidth = 1.2;

    for (const row of cachedVisible) {
      n.strokeStyle = row.color;
      n.stroke(row.path);
      d.strokeStyle = row.color;
      d.stroke(row.path);
    }

    n.restore();
    d.restore();
    offNormal = oc1;
    offDimmed = oc2;
    ctx.clearRect(0, 0, totalW, totalH);
    ctx.drawImage(offNormal, 0, 0);
  }

  // axes
  const axisGs = svg
    .selectAll<SVGGElement, (typeof dims)[0]>(".dim")
    .data(dims)
    .enter()
    .append("g")
    .attr("class", "dim")
    .attr("transform", (d) => `translate(${d.x},0)`);

  axisGs.each(function ({ key }) {
    d3.select(this).call(
      d3
        .axisLeft(yScales.get(key)! as d3.AxisScale<d3.NumberValue>)
        .ticks(5, "~s"),
    );
  });

  axisGs
    .append("text")
    .attr("y", -16)
    .attr("text-anchor", "middle")
    .attr("font-size", 11)
    .attr("font-weight", "600")
    .attr("fill", "currentColor")
    .text((d) => d.label);

  const brushClearFns: Array<() => void> = [];

  axisGs
    .append("g")
    .attr("class", "brush")
    .each(function ({ key, log }) {
      const scale = yScales.get(key)!;
      const fmt = d3.format(log ? ".2~s" : ".2~f");
      const invert = (y: number) =>
        (scale as d3.ScaleLinear<number, number>).invert(y);

      const labelAttrs = (
        t: d3.Selection<SVGTextElement, unknown, null, undefined>,
      ) =>
        t
          .attr("class", "brush-label")
          .attr("x", 15)
          .attr("text-anchor", "start")
          .attr("font-size", 10)
          .attr("fill", "currentColor")
          .style("visibility", "hidden");

      const topLabel = labelAttrs(
        d3.select(this.parentNode as Element).append<SVGTextElement>("text"),
      );
      const bottomLabel = labelAttrs(
        d3.select(this.parentNode as Element).append<SVGTextElement>("text"),
      );

      const brushBehavior = d3
        .brushY()
        .extent([
          [-12, 0],
          [12, h],
        ])
        .on("brush end", (event: d3.D3BrushEvent<(typeof dims)[0]>) => {
          const sel = event.selection as [number, number] | null;
          selectedIntervals.set(key, sel);
          if (sel) {
            topLabel
              .style("visibility", "visible")
              .attr("y", sel[0] - 2)
              .text(fmt(invert(sel[0])));
            bottomLabel
              .style("visibility", "visible")
              .attr("y", sel[1] + 10)
              .text(fmt(invert(sel[1])));
          } else {
            topLabel.style("visibility", "hidden");
            bottomLabel.style("visibility", "hidden");
          }
          if (event.type === "end") {
            rebuildAndDraw();
          } else {
            draw(PREVIEW_LIMIT);
          }
        });

      const brushG = d3.select(this);
      brushG.call(brushBehavior);
      brushClearFns.push(() => brushG.call(brushBehavior.move, null));
    });

  const clearBtn = document.createElement("button");
  clearBtn.textContent = "Clear selections";
  clearBtn.className = "viz2-clear-btn";
  clearBtn.style.top = `8px`;
  clearBtn.style.right = `${MARGIN.right}px`;
  clearBtn.addEventListener("click", async () => {
    clearBtn.innerHTML = '<span class="viz2-spinner"></span>';
    clearBtn.disabled = true;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    batchClearing = true;
    brushClearFns.forEach((fn) => fn());
    batchClearing = false;
    rebuildAndDraw();
    clearBtn.textContent = "Clear selections";
    clearBtn.disabled = false;
  });
  container.appendChild(clearBtn);

  const defs = svg.append("defs");
  const grad = defs.append("linearGradient").attr("id", "pcpGrad");
  [0, 0.5, 1].forEach((t) =>
    grad
      .append("stop")
      .attr("offset", `${t * 100}%`)
      .attr("stop-color", colorOf(t)),
  );

  const bottomBarWidth = w * 0.8;
  const bottomBar = svg
    .append("g")
    .attr("transform", `translate(${w / 2 - bottomBarWidth / 2},${h + 35})`);
  bottomBar
    .append("rect")
    .attr("width", bottomBarWidth)
    .attr("height", 10)
    .style("fill", "url(#pcpGrad)");

  (
    [
      ["Negative reviews", 0],
      ["Positive reviews", bottomBarWidth],
    ] as [string, number][]
  ).forEach(([label, x]) =>
    bottomBar
      .append("text")
      .attr("x", x)
      .attr("y", -5)
      .attr("text-anchor", x === 0 ? "start" : "end")
      .attr("font-size", 14)
      .attr("fill", "currentColor")
      .text(label),
  );

  const tooltip = document.createElement("div");
  tooltip.className = "viz2-tooltip";
  container.appendChild(tooltip);

  let hoveredRow: Viz2Row | null = null;

  // RAF-throttled hover: only one processHover per animation frame.
  let moveRafId: number | null = null;
  let pendingMx = 0;
  let pendingMy = 0;

  // Spatial pre-filter + isPointInStroke hit test.
  // Paths live in [0,w]×[0,h] space; mx/my must be in that same space.
  function hitTest(mx: number, my: number): Viz2Row | null {
    // Find the axis segment the mouse is between.
    let segIdx = -1;
    for (let i = 0; i < dims.length - 1; i++) {
      if (mx >= dims[i].x - 8 && mx <= dims[i + 1].x + 8) {
        segIdx = i;
        break;
      }
    }
    if (segIdx === -1) return null;

    // Interpolation fraction along the segment.
    const t = Math.max(
      0,
      Math.min(1, (mx - dims[segIdx].x) / (dims[segIdx + 1].x - dims[segIdx].x)),
    );
    // Pre-filter threshold: lineWidth/2 (5px) + small buffer.
    const THRESH = 8;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.lineWidth = 10;
    let found: Viz2Row | null = null;
    for (const row of cachedVisible) {
      const yInterp =
        row.yValues[segIdx] * (1 - t) + row.yValues[segIdx + 1] * t;
      if (Math.abs(yInterp - my) >= THRESH) continue;
      if (ctx.isPointInStroke(row.path, mx, my)) {
        found = row;
        break;
      }
    }
    ctx.restore();
    return found;
  }

  function showTooltip(row: Viz2Row, screenX: number, screenY: number) {
    tooltip.textContent = row.name;
    tooltip.style.display = "block";
    const overflows = screenX + 14 + tooltip.offsetWidth > container.clientWidth;
    tooltip.style.left = overflows
      ? `${screenX - 14 - tooltip.offsetWidth}px`
      : `${screenX + 14}px`;
    tooltip.style.top = `${screenY - 12}px`;
  }

  function processHover(mx: number, my: number) {
    if (batchClearing) return;
    const found = hitTest(mx, my);
    if (found === hoveredRow) return;
    hoveredRow = found;
    if (found) {
      drawHover(found);
      showTooltip(found, mx + MARGIN.left, my + MARGIN.top);
    } else {
      draw();
      tooltip.style.display = "none";
    }
  }

  container.addEventListener("mousemove", (e) => {
    if (batchClearing) return;
    const rect = container.getBoundingClientRect();
    pendingMx = e.clientX - rect.left - MARGIN.left;
    pendingMy = e.clientY - rect.top - MARGIN.top;

    // Keep tooltip position in sync on every move without waiting for RAF.
    if (tooltip.style.display === "block") {
      showTooltip(hoveredRow!, e.clientX - rect.left, e.clientY - rect.top);
    }

    if (moveRafId === null) {
      moveRafId = requestAnimationFrame(() => {
        moveRafId = null;
        processHover(pendingMx, pendingMy);
      });
    }
  });

  container.addEventListener("mouseleave", () => {
    if (moveRafId !== null) {
      cancelAnimationFrame(moveRafId);
      moveRafId = null;
    }
    tooltip.style.display = "none";
    hoveredRow = null;
    draw();
  });

  tagSelect.addEventListener("change", () => {
    selectedTag = tagSelect.value || null;
    hoveredRow = null;
    tooltip.style.display = "none";
    rebuildAndDraw();
  });

  rebuildAndDraw();
}
