import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { i18nReady } from "@/shared/lib/i18n/i18n";
import { LoginView } from "./LoginView";
import "@/app/styles/globals.css";

const el = document.getElementById("root");
if (!el) throw new Error("root element not found");

void i18nReady.then(() => {
  createRoot(el).render(
    <StrictMode>
      <LoginView />
    </StrictMode>,
  );
});
