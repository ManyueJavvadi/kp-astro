export interface PlaceSuggestion { name: string; display: string; lat: number; lon: number; }
export interface BirthDetails { name: string; date: string; time: string; ampm: string; place: string; latitude: number | null; longitude: number | null; gender: "male" | "female" | ""; }
export interface Message { id: string; question: string; answer: string; analysis: any; timestamp: string; feedback?: "correct" | "incorrect"; note?: string; }
export interface ChartSession {
  id: string; name: string;
  birthDetails: BirthDetails;
  workspaceData: any;
  analysisMessages: { q: string; a: string; isTopic?: boolean }[];
  activeTopic: string;
  selectedHouse: number | null;
  chatQ: string;
  analysisLang: "english" | "telugu_english";
  activeTab: string;
}
