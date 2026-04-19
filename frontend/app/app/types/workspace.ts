// WorkspaceData type definitions — replaces `any` throughout page.tsx
// Generated as part of KP DevAstroAI UI upgrade

export interface Planet {
  planet_en: string;
  planet_te: string;
  planet_short: string;
  sign_en: string;
  sign_te: string;
  longitude: number;
  degree_in_sign: number;
  nakshatra_en: string;
  nakshatra_te: string;
  star_lord_en: string;
  star_lord_te: string;
  sub_lord_en: string;
  sub_lord_te: string;
  house: string;
  retrograde: boolean;
}

export interface Cusp {
  house: number;
  sign_en: string;
  sign_te: string;
  cusp_longitude: number;
  nakshatra_en: string;
  star_lord_en: string;
  sub_lord_en: string;
}

export interface Significator {
  house: number;
  planets: string[];
}

export interface CSLChain {
  csl: string;
  csl_house: number;
  csl_rules: number[];
  csl_nakshatra: string;
  csl_star_lord: string;
  csl_star_lord_house: number;
  csl_star_lord_rules: number[];
  csl_sub_lord: string;
  csl_sub_lord_house: number;
  csl_sub_lord_rules: number[];
  all_significations: number[];
  chain_text: string;
}

export interface Mahadasha {
  lord: string;
  start: string;
  end: string;
  years: number;
}

export interface Antardasha {
  lord: string;
  start: string;
  end: string;
  md_lord?: string;
}

export interface Pratyantardasha {
  lord: string;
  start: string;
  end: string;
}

export interface RulingPlanet {
  planet: string;
  role: string;
  planet_te?: string;
}

export interface WorkspaceData {
  planets: Planet[];
  cusps: Record<string, Cusp>;
  lagna: string;
  lagna_en?: string;
  lagna_te?: string;
  dashas: Mahadasha[];
  current_dasha: Mahadasha;
  antardashas: Antardasha[];
  current_antardasha: Antardasha;
  pratyantardashas: Pratyantardasha[];
  current_pratyantardasha: Pratyantardasha;
  all_significators: Significator[];
  ruling_planets: RulingPlanet[];
  csl_chains: Record<string, CSLChain>;
  panchangam_today: PanchangamData;
  panchangam_birth: PanchangamData;
  promise_analysis?: Record<string, unknown>;
  chart?: Record<string, unknown>;
}

export interface PanchangamData {
  tithi: string;
  tithi_en: string;
  tithi_num: number;
  nakshatra: string;
  nakshatra_en: string;
  yoga: string;
  yoga_en: string;
  vara: string;
  vara_en: string;
  rahu_kalam: string;
  sunrise: string;
  sunset: string;
  karana: string;
  karana_te: string;
  hora_lord: string;
  date: string;
  time: string;
}

// House topic labels (used in HouseOverviewGrid)
export const HOUSE_TOPICS: Record<number, string> = {
  1:  "Self & Personality",
  2:  "Wealth & Family",
  3:  "Siblings & Courage",
  4:  "Mother & Property",
  5:  "Children & Intellect",
  6:  "Enemies & Health",
  7:  "Marriage & Partner",
  8:  "Longevity & Secrets",
  9:  "Luck & Dharma",
  10: "Career & Status",
  11: "Gains & Friends",
  12: "Loss & Liberation",
};

// Planet symbol map — re-exported from the canonical source at
// @/lib/planets. All glyphs, colors, short codes live there now.
export { PLANET_SYMBOLS } from "@/lib/planets";
