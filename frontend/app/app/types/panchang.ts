// Panchang / Panchangam type definitions

export interface ChoghadiyaPeriod {
  name: string;          // "Amrit", "Shubh", "Labh", "Chal", "Rog", "Kaal", "Udveg"
  quality: "auspicious" | "neutral" | "inauspicious";
  start: string;         // "HH:MM"
  end: string;           // "HH:MM"
  is_current: boolean;
  is_day: boolean;       // true = daytime period, false = nighttime
}

export interface HoraPeriod {
  lord: string;          // planet name
  start: string;         // "HH:MM"
  end: string;           // "HH:MM"
  is_current: boolean;
  is_auspicious: boolean;
}

export interface LocationPanchangam {
  // Basic
  date: string;
  vara: string;           // Telugu weekday
  vara_en: string;        // English weekday
  // Tithi
  tithi: string;
  tithi_en: string;
  tithi_num: number;
  tithi_upto?: string;
  // Nakshatra
  nakshatra: string;
  nakshatra_en: string;
  nakshatra_upto?: string;
  pada?: number;
  // Yoga
  yoga: string;
  yoga_en: string;
  yoga_upto?: string;
  // Karana
  karana: string;
  karana_te: string;
  // Sunrise / Sunset
  sunrise: string;
  sunset: string;
  // Rahu Kalam
  rahu_kalam: string;
  yamagandam?: string;
  // Hora
  hora_lord: string;
  current_hora?: HoraPeriod;
  hora_sequence?: HoraPeriod[];
  // Choghadiya
  choghadiya?: ChoghadiyaPeriod[];
}

// Choghadiya quality classification
export const CHOGHADIYA_QUALITY: Record<string, ChoghadiyaPeriod["quality"]> = {
  Amrit:  "auspicious",
  Shubh:  "auspicious",
  Labh:   "auspicious",
  Chal:   "neutral",
  Rog:    "inauspicious",
  Kaal:   "inauspicious",
  Udveg:  "inauspicious",
};

export const CHOGHADIYA_CSS_CLASS: Record<string, string> = {
  Amrit:  "cho-amrit",
  Shubh:  "cho-shubh",
  Labh:   "cho-labh",
  Chal:   "cho-chal",
  Rog:    "cho-rog",
  Kaal:   "cho-kaal",
  Udveg:  "cho-udveg",
};
