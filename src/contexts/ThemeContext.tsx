import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ThemeName = "Dark" | "Navy" | "Amber" | "Light";

type ThemeVars = Record<string, string>;

type ThemeDefinition = {
  name: ThemeName;
  swatch: string;
  /** CSS variables (HSL triplets, no hsl() wrapper) applied to :root */
  vars: ThemeVars;
};

// Fluario purple primary across all themes
const PURPLE = "262 83% 58%";
const PURPLE_LIGHT = "252 95% 76%";
const PURPLE_DEEP = "262 83% 48%";

const THEMES: Record<ThemeName, ThemeDefinition> = {
  Dark: {
    name: "Dark",
    swatch: "linear-gradient(90deg, hsl(235 22% 13%) 0%, hsl(233 30% 9%) 100%)",
    vars: {
      "--background": "233 30% 7%",
      "--foreground": "40 18% 92%",
      "--card": "235 22% 11%",
      "--card-foreground": "40 18% 92%",
      "--popover": "235 22% 11%",
      "--popover-foreground": "40 18% 92%",
      "--primary": PURPLE,
      "--primary-foreground": "0 0% 100%",
      "--secondary": "234 16% 16%",
      "--secondary-foreground": "40 12% 88%",
      "--muted": "234 12% 14%",
      "--muted-foreground": "230 10% 62%",
      "--accent": "234 16% 16%",
      "--accent-foreground": "40 18% 92%",
      "--border": "230 12% 22%",
      "--input": "230 12% 22%",
      "--ring": PURPLE,
      "--sidebar-background": "234 30% 8%",
      "--sidebar-foreground": "40 16% 90%",
      "--sidebar-primary": PURPLE,
      "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": "234 16% 14%",
      "--sidebar-accent-foreground": "40 16% 90%",
      "--sidebar-border": "230 12% 20%",
      "--sidebar-ring": PURPLE,
      "--brand-amber": PURPLE,
      "--brand-orange": PURPLE_LIGHT,
      "--brand-deep": PURPLE_DEEP,
      "--app-bg-radial": PURPLE,
      "--app-bg-from": "233 30% 7%",
      "--app-bg-to": "233 32% 5%",
      "--surface-overlay": "0 0% 100%",
      "--surface-overlay-strong": "0 0% 100%",
    },
  },
  Navy: {
    name: "Navy",
    swatch: "linear-gradient(90deg, hsl(220 60% 13%) 0%, hsl(220 60% 18%) 100%)",
    vars: {
      "--background": "220 55% 9%",
      "--foreground": "210 30% 95%",
      "--card": "220 50% 13%",
      "--card-foreground": "210 30% 95%",
      "--popover": "220 50% 13%",
      "--popover-foreground": "210 30% 95%",
      "--primary": PURPLE,
      "--primary-foreground": "0 0% 100%",
      "--secondary": "220 40% 18%",
      "--secondary-foreground": "210 30% 95%",
      "--muted": "220 35% 16%",
      "--muted-foreground": "215 18% 68%",
      "--accent": "220 40% 18%",
      "--accent-foreground": "210 30% 95%",
      "--border": "220 30% 24%",
      "--input": "220 30% 24%",
      "--ring": PURPLE,
      "--sidebar-background": "220 60% 8%",
      "--sidebar-foreground": "210 30% 92%",
      "--sidebar-primary": PURPLE,
      "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": "220 40% 14%",
      "--sidebar-accent-foreground": "210 30% 92%",
      "--sidebar-border": "220 30% 22%",
      "--sidebar-ring": PURPLE,
      "--brand-amber": PURPLE,
      "--brand-orange": PURPLE_LIGHT,
      "--brand-deep": PURPLE_DEEP,
      "--app-bg-radial": PURPLE,
      "--app-bg-from": "220 55% 9%",
      "--app-bg-to": "220 60% 6%",
      "--surface-overlay": "0 0% 100%",
      "--surface-overlay-strong": "0 0% 100%",
    },
  },
  Amber: {
    name: "Amber",
    swatch: "linear-gradient(90deg, hsl(262 60% 18%) 0%, hsl(262 70% 28%) 100%)",
    vars: {
      "--background": "262 30% 8%",
      "--foreground": "36 40% 94%",
      "--card": "262 25% 12%",
      "--card-foreground": "36 40% 94%",
      "--popover": "262 25% 12%",
      "--popover-foreground": "36 40% 94%",
      "--primary": PURPLE,
      "--primary-foreground": "0 0% 100%",
      "--secondary": "262 20% 18%",
      "--secondary-foreground": "36 40% 94%",
      "--muted": "262 18% 15%",
      "--muted-foreground": "262 12% 70%",
      "--accent": "262 20% 18%",
      "--accent-foreground": "36 40% 94%",
      "--border": "262 18% 24%",
      "--input": "262 18% 24%",
      "--ring": PURPLE,
      "--sidebar-background": "262 35% 7%",
      "--sidebar-foreground": "36 40% 92%",
      "--sidebar-primary": PURPLE,
      "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": "262 20% 14%",
      "--sidebar-accent-foreground": "36 40% 92%",
      "--sidebar-border": "262 18% 22%",
      "--sidebar-ring": PURPLE,
      "--brand-amber": PURPLE,
      "--brand-orange": PURPLE_LIGHT,
      "--brand-deep": PURPLE_DEEP,
      "--app-bg-radial": PURPLE,
      "--app-bg-from": "262 30% 8%",
      "--app-bg-to": "262 40% 5%",
      "--surface-overlay": "262 80% 90%",
      "--surface-overlay-strong": "262 80% 90%",
    },
  },
  Light: {
    name: "Light",
    swatch: "linear-gradient(90deg, hsl(220 20% 94%) 0%, hsl(220 20% 98%) 100%)",
    vars: {
      "--background": "220 25% 97%",
      "--foreground": "230 30% 12%",
      "--card": "0 0% 100%",
      "--card-foreground": "230 30% 12%",
      "--popover": "0 0% 100%",
      "--popover-foreground": "230 30% 12%",
      "--primary": PURPLE,
      "--primary-foreground": "0 0% 100%",
      "--secondary": "220 18% 92%",
      "--secondary-foreground": "230 30% 12%",
      "--muted": "220 18% 94%",
      "--muted-foreground": "230 12% 42%",
      "--accent": "220 18% 92%",
      "--accent-foreground": "230 30% 12%",
      "--border": "220 16% 86%",
      "--input": "220 16% 86%",
      "--ring": PURPLE,
      "--sidebar-background": "220 25% 99%",
      "--sidebar-foreground": "230 30% 18%",
      "--sidebar-primary": PURPLE,
      "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": "220 18% 94%",
      "--sidebar-accent-foreground": "230 30% 18%",
      "--sidebar-border": "220 16% 88%",
      "--sidebar-ring": PURPLE,
      "--brand-amber": PURPLE,
      "--brand-orange": PURPLE_LIGHT,
      "--brand-deep": PURPLE_DEEP,
      "--app-bg-radial": PURPLE,
      "--app-bg-from": "220 25% 97%",
      "--app-bg-to": "220 25% 94%",
      "--surface-overlay": "230 30% 12%",
      "--surface-overlay-strong": "230 30% 18%",
    },
  },
};

export const THEME_LIST = (Object.keys(THEMES) as ThemeName[]).map(n => ({
  name: n,
  swatch: THEMES[n].swatch,
}));

type ThemeContextValue = {
  theme: ThemeName;
  setTheme: (name: ThemeName) => void;
  themes: typeof THEME_LIST;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider = ({ children, defaultTheme = "Navy" }: { children: ReactNode; defaultTheme?: ThemeName }) => {
  const [theme, setTheme] = useState<ThemeName>(defaultTheme);

  useEffect(() => {
    const root = document.documentElement;
    const def = THEMES[theme];
    Object.entries(def.vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    root.dataset.theme = theme;
    root.style.colorScheme = theme === "Light" ? "light" : "dark";
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme, themes: THEME_LIST }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
