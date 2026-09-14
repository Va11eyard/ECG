import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import kz from "./locales/kz.json";
import ru from "./locales/ru.json";

export const i18nReady = (() => {
  if (i18n.isInitialized) return Promise.resolve();
  return i18n.use(initReactI18next).init({
    lng: "ru",
    fallbackLng: "ru",
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
