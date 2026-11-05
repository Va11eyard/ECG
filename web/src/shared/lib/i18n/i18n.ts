import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import kz from "./locales/kz.json";
import ru from "./locales/ru.json";

function detectLng(): "ru" | "en" | "kz" {
  for (const tag of navigator.languages.length > 0 ? navigator.languages : [navigator.language]) {
    const l = tag.toLowerCase();
    if (l.startsWith("ru")) return "ru";
    if (l.startsWith("kk") || l.startsWith("kz")) return "kz";
    if (l.startsWith("en")) return "en";
  }
  return "en";
}

export const i18nReady = (() => {
  if (i18n.isInitialized) return Promise.resolve();
  return i18n.use(initReactI18next).init({
    lng: detectLng(),
    fallbackLng: "en",
    supportedLngs: ["ru", "en", "kz"],
    defaultNS: "translation",
    resources: {
      ru: { translation: ru },
      en: { translation: en },
      kz: { translation: kz },
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
})();

export { i18n };
