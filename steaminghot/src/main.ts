import { loadData } from "./dataLoader";
import { initViz1 } from "./viz/viz1";
import { Game } from "./types";

async function main() {
  const data: Game[] = await loadData();

  const c1 = document.querySelector<HTMLElement>(".viz1");

  if (c1) initViz1(c1, data);
}


// Entry point of the application
main();