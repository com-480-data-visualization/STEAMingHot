export interface Viz2Row {
  name: string;
  color: string;
  yValues: number[];
  path: Path2D;
  price: number;
  positiveRatio: number;
  totalReviews: number;
  medianPlaytime: number;
  peakCcu: number;
  achievements: number;
  dlcCount: number;
}

export type Viz2RowKey = Exclude<
  keyof Viz2Row,
  "name" | "color" | "yValues" | "path"
>;

export interface Viz2Dimension {
  key: Viz2RowKey;
  label: string;
  log: boolean;
}

export interface Game {
  game_id: string;
  name: string;
  release_date: string;
  required_age: number;
  price: number;
  dlc_count: number;
  short_description: string;
  header_image: string;
  windows: boolean;
  mac: boolean;
  linux: boolean;
  metacritic_score: number;
  metacritic_url: string;
  achievements: number;
  recommendations: number;
  notes: string;
  supported_languages: string[];
  full_audio_languages: string[];
  developers: string[];
  publishers: string[];
  categories: string[];
  genres: string[];
  movies: string[];
  positive: number;
  negative: number;
  estimated_owners: string;
  average_playtime_forever: number;
  average_playtime_2weeks: number;
  median_playtime_forever: number;
  median_playtime_2weeks: number;
  discount: string;
  peak_ccu: number;
  tags: Record<string, number>;
}
