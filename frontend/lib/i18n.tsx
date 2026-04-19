"use client";

/**
 * Universal language toggle for DevAstroAI.
 *
 * Three modes:
 *   "en"    → English only (no Telugu anywhere in chrome)
 *   "te_en" → Bilingual: Telugu primary + English subtitle / KP terms
 *             stay in English (current default — matches AI "telugu_english")
 *   "te"    → Telugu primary (minimal English, KP technical terms stay
 *             in English since practitioners rely on them)
 *
 * Persists to localStorage so the choice survives reloads. Falls back
 * to "te_en" for first-time users (preserves v1 behavior).
 *
 * Pairs with `backend/.../llm_service.py` `language` param — we map
 * UI language → backend language on AI requests:
 *   "en"    → "english"
 *   "te_en" → "telugu_english"
 *   "te"    → "telugu_english"   (backend has no pure-Telugu mode yet;
 *                                 accuracy penalty is non-trivial per
 *                                 research — keep as-is for now)
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "te_en" | "te";

const LS_KEY = "devastroai:lang";
const DEFAULT_LANG: Lang = "te_en";

interface LanguageCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Pick the right string for the current language. */
  t: (en: string, te: string) => string;
  /** Pick a field off an object that has both _en and _te siblings. */
  tField: <T extends Record<string, unknown>>(obj: T | null | undefined, base: string) => string;
  /** Map UI language → backend `language` param. */
  backendLang: () => "english" | "telugu_english";
}

const Ctx = createContext<LanguageCtx | null>(null);

/** Read the initial language safely on both server and client. */
function readInitial(): Lang {
  if (typeof window === "undefined") return DEFAULT_LANG;
  const v = window.localStorage.getItem(LS_KEY);
  if (v === "en" || v === "te_en" || v === "te") return v;
  return DEFAULT_LANG;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  // Hydrate from localStorage after mount (avoids SSR mismatch).
  useEffect(() => {
    setLangState(readInitial());
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(LS_KEY, l);
    } catch {
      /* private browsing / quota */
    }
  }, []);

  const t = useCallback(
    (en: string, te: string) => {
      if (lang === "en") return en;
      if (lang === "te") return te;
      // bilingual default — primary Telugu, fall back to English if empty.
      return te || en;
    },
    [lang]
  );

  const tField = useCallback(
    <T extends Record<string, unknown>>(
      obj: T | null | undefined,
      base: string
    ): string => {
      if (!obj) return "";
      const enKey = `${base}_en`;
      const teKey = `${base}_te`;
      const enVal = (obj[enKey] as string) ?? "";
      const teVal = (obj[teKey] as string) ?? "";
      if (lang === "en") return enVal || teVal;
      if (lang === "te") return teVal || enVal;
      return teVal || enVal;
    },
    [lang]
  );

  const backendLang = useCallback(
    (): "english" | "telugu_english" =>
      lang === "en" ? "english" : "telugu_english",
    [lang]
  );

  const value: LanguageCtx = { lang, setLang, t, tField, backendLang };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLanguage(): LanguageCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Safe no-op fallback so components work even if provider forgot.
    return {
      lang: DEFAULT_LANG,
      setLang: () => {},
      t: (_en, te) => te,
      tField: (obj, base) => {
        if (!obj) return "";
        const te = (obj[`${base}_te` as keyof typeof obj] as string) ?? "";
        const en = (obj[`${base}_en` as keyof typeof obj] as string) ?? "";
        return te || en;
      },
      backendLang: () => "telugu_english",
    };
  }
  return ctx;
}

/**
 * Convenience for components that need just the `t()` function without
 * re-rendering on every lang change (e.g. plain label strings in a loop).
 */
export function useT() {
  return useLanguage().t;
}
