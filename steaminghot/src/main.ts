import { loadData } from "./dataLoader";
import { initViz1 } from "./viz/viz1";
import { initViz2 } from "./viz/viz2";
import { initViz3 } from "./viz/viz3";
import { initDummy } from "./viz/dummy";
import { Game } from "./types";

async function main() {
  const data: Game[] = await loadData();

  const dummy = document.querySelector<HTMLElement>(".dummy-viz");
  const c1 = document.querySelector<HTMLElement>(".viz1");
  const c2 = document.querySelector<HTMLElement>(".viz2");
  const c3 = document.querySelector<HTMLElement>(".viz3");

  if (dummy) initDummy(dummy, data);
  if (c1) initViz1(c1, data);
  if (c2) initViz2(c2, data);
  if (c3) initViz3(c3, data);
}

// Entry point of the application
main();