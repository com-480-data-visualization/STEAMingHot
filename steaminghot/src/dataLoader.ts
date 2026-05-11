import { decode } from "@msgpack/msgpack";
import { Game } from "./types";

export async function loadData(): Promise<Game[]> {
  const response = await fetch("./games.msgpack");
  const buffer = await response.arrayBuffer();
  const compact = decode(new Uint8Array(buffer)) as {
    schema: string[];
    games: unknown[][];
  };

  const schema = compact.schema;

  return compact.games.map((gameData) => {
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < schema.length; i++) {
      obj[schema[i]] = gameData[i];
    }
    return obj as Game;
  });
}