// RPG: character sheets and battles. A URL with ?screen= is a design preview on mock data; the installed app is real.
import { createRoot } from "react-dom/client";
import "@fontsource/kurale";
import "./styles/tokens.css";
import "./styles/app.css";
import { AppShell } from "@/shell/app-shell";
import { applyTheme, followShell, initialTheme } from "@/lib/theme";
import { initLang } from "@/i18n";

applyTheme(initialTheme());
followShell();
initLang();
createRoot(document.getElementById("app")!).render(<AppShell />);
