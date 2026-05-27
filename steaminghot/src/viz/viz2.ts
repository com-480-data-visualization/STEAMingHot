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
    price: g.price,
    positiveRatio: (g.positive / total) * 100,
    totalReviews: total,
    medianPlaytime: g.median_playtime_forever / 60,
    peakCcu: g.peak_ccu,
    achievements: g.achievements,
    dlcCount: g.dlc_count,
  };
}

// compute scales for each y-axis
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
  // filter out games outlier games and map to rows
  const rows = data
    .filter(
      (g) => g.positive + g.negative >= MIN_REVIEWS && g.price <= MAX_PRICE,
    )
    .map(toRow);

  // set up graph dimensions
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

  // for each game, compute its path from y-values and get colour from positive ratio
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

  // user-selected intervals for each y-axis
  const selectedIntervals = new Map<Viz2RowKey, [number, number] | null>(
    DIMS.map((d) => [d.key, null]),
  );

  function isSelected(row: Viz2Row): boolean {
    for (let i = 0; i < DIMS.length; i++) {
      const interval = selectedIntervals.get(DIMS[i].key);
      if (!interval) continue;
      const y = row.yValues[i];
      if (y < Math.min(...interval) || y > Math.max(...interval)) return false;
    }
    return true;
  }

  // filter out games based on user selection
  function visibleGameRows(limit: number | null): Viz2Row[] {
    const anyInterval = [...selectedIntervals.values()].some(Boolean);
    if (!anyInterval) return rows;
    const result: Viz2Row[] = [];
    for (const row of rows) {
      if (!isSelected(row)) continue;
      result.push(row);
      if (limit !== null && result.length >= limit) break;
    }
    return result;
  }

  let batchClearing = false;

  function draw(limit: number | null = null) {
    if (batchClearing) return;
    ctx.clearRect(0, 0, totalW, totalH);
    ctx.save();
    ctx.translate(MARGIN.left, MARGIN.top);
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1.2;
    for (const row of visibleGameRows(limit)) {
      ctx.strokeStyle = row.color;
      ctx.stroke(row.path);
    }
    ctx.restore();
  }

  // time-sliced version: strokes for ~12ms then yields a frame so animations keep running
  async function drawAsync() {
    const visible = visibleGameRows(null);
    ctx.clearRect(0, 0, totalW, totalH);
    ctx.save();
    ctx.translate(MARGIN.left, MARGIN.top);
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1.2;
    let frameEnd = performance.now() + 12;
    for (const row of visible) {
      ctx.strokeStyle = row.color;
      ctx.stroke(row.path);
      if (performance.now() >= frameEnd) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        frameEnd = performance.now() + 12;
      }
    }
    ctx.restore();
  }

  // render axes and selections
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
          draw(event.type === "end" ? null : PREVIEW_LIMIT);
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
    await drawAsync();
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

  // hover: dim all lines except the hovered one
  function drawHover(hovered: Viz2Row) {
    const visible = visibleGameRows(null);
    ctx.clearRect(0, 0, totalW, totalH);
    ctx.save();
    ctx.translate(MARGIN.left, MARGIN.top);
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.08;
    for (const row of visible) {
      if (row === hovered) continue;
      ctx.strokeStyle = row.color;
      ctx.stroke(row.path);
    }
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = hovered.color;
    ctx.stroke(hovered.path);
    ctx.restore();
  }

  const tooltip = document.createElement("div");
  tooltip.className = "viz2-tooltip";
  container.appendChild(tooltip);

  let hoveredRow: Viz2Row | null = null;
  let tooltipTimer: ReturnType<typeof setTimeout> | null = null;
  let lastMouse = { x: 0, y: 0 };

  container.addEventListener("mousemove", (e) => {
    if (batchClearing) return;
    const rect = container.getBoundingClientRect();
    lastMouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const mx = lastMouse.x - MARGIN.left;
    const my = lastMouse.y - MARGIN.top;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.lineWidth = 10;
    let found: Viz2Row | null = null;
    for (const row of visibleGameRows(null)) {
      if (ctx.isPointInStroke(row.path, mx, my)) {
        found = row;
        break;
      }
    }
    ctx.restore();

    if (found === hoveredRow) {
      if (tooltip.style.display === "block") {
        tooltip.style.left = `${lastMouse.x + 14}px`;
        tooltip.style.top = `${lastMouse.y - 12}px`;
      }
      return;
    }

    hoveredRow = found;
    if (tooltipTimer) { clearTimeout(tooltipTimer); tooltipTimer = null; }
    tooltip.style.display = "none";

    if (found) {
      drawHover(found);
      tooltipTimer = setTimeout(() => {
        if (!hoveredRow) return;
        tooltip.textContent = hoveredRow.name;
        tooltip.style.left = `${lastMouse.x + 14}px`;
        tooltip.style.top = `${lastMouse.y - 12}px`;
        tooltip.style.display = "block";
      }, 500);
    } else {
      draw();
    }
  });

  container.addEventListener("mouseleave", () => {
    if (tooltipTimer) { clearTimeout(tooltipTimer); tooltipTimer = null; }
    tooltip.style.display = "none";
    hoveredRow = null;
    draw();
  });

  draw();
}
