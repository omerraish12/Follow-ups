import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import enTranslations from "../locales/en.json";
import heTranslations from "../locales/he.json";

type Language = "en" | "he";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  en: enTranslations,
  he: heTranslations,
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    // Get language from localStorage or browser language
    const saved = localStorage.getItem("language") as Language;
    if (saved) {
      setLanguageState(saved);
      applyLanguage(saved);
    } else {
      // Detect browser language
      const browserLang = navigator.language.split("-")[0];
      const detectedLang = (browserLang === "he" ? "he" : "en") as Language;
      setLanguageState(detectedLang);
      applyLanguage(detectedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
    applyLanguage(lang);
  };

  const applyLanguage = (lang: Language) => {
    const html = document.documentElement;
    html.lang = lang;
    html.dir = lang === "he" ? "rtl" : "ltr";
    document.body.dir = lang === "he" ? "rtl" : "ltr";
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};
