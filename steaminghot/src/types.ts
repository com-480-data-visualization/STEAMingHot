export interface Viz2Row {
  name: string;
  color: string;
  yValues: number[];
  path: Path2D;
  tags: string[];
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
  "name" | "color" | "yValues" | "path" | "tags"
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
  metacritic_score: number;
  achievements: number;
  recommendations: number;
  developers: string[];
  publishers: string[];
  genres: string[];
  positive: number;
  negative: number;
  estimated_owners: string;
  average_playtime_forever: number;
  median_playtime_forever: number;
  median_playtime_2weeks: number;
  peak_ccu: number;
  tags: Record<string, number>;
  // The following fields where not used in our visualizations, but could have 
  // been used for further analysis or visualizations. They are dropped during preprocessing
  // but could be included in the future if needed.

  // windows: boolean;
  // mac: boolean;
  // linux: boolean;
  // metacritic_url: string;
  // notes: string;
  // supported_languages: string[];
  // full_audio_languages: string[];
  // categories: string[];
  // movies: string[];
  // average_playtime_2weeks: number;
  // discount: string;
}
