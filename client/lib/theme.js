// Theme choice: "system" (follow the device), "light" or "dark".
// The choice is stored in localStorage and applied as <html data-theme="…">;
// globals.css picks the token values from that attribute.
const KEY = "theme";
export const THEMES = ["system", "light", "dark"];

export function getTheme() {
  try {
    const t = localStorage.getItem(KEY);
    return THEMES.includes(t) ? t : "system";
  } catch {
    return "system"; // storage blocked (private mode etc.)
  }
}

export function setTheme(theme) {
  try {
    if (theme === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {}
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

// Runs in <head> before the page paints, so a dark-mode visitor never sees a white flash.
export const themeScript = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
