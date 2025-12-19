import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

export const THEME_COLORS = [
  { value: "neutral", label: "Neutral" },
  { value: "indigo", label: "Indigo" },
  { value: "claude", label: "Claude" },
  { value: "amethyst-haze", label: "Amethyst Haze" },
  { value: "bold-tech", label: "Bold Tech" },
  { value: "bubblegum", label: "Bubblegum" },
  { value: "caffeine", label: "Caffeine" },
  { value: "candyland", label: "Candyland" },
  { value: "catppuccin", label: "Catppuccin" },
  { value: "claymorphism", label: "Claymorphism" },
  { value: "clean-slate", label: "Clean Slate" },
  { value: "cosmic-night", label: "Cosmic Night" },
  { value: "cyberpunk", label: "Cyberpunk" },
  { value: "darkmatter", label: "Darkmatter" },
  { value: "doom-64", label: "Doom 64" },
  { value: "graphite", label: "Graphite" },
  { value: "kodama-grove", label: "Kodama Grove" },
  { value: "midnight-bloom", label: "Midnight Bloom" },
  { value: "mocha-mousse", label: "Mocha Mousse" },
  { value: "modern-minimal", label: "Modern Minimal" },
  { value: "mono", label: "Mono" },
  { value: "nature", label: "Nature" },
  { value: "neo-brutalism", label: "Neo Brutalism" },
  { value: "northern-lights", label: "Northern Lights" },
  { value: "notebook", label: "Notebook" },
  { value: "ocean-breeze", label: "Ocean Breeze" },
  { value: "pastel-dreams", label: "Pastel Dreams" },
  { value: "perpetuity", label: "Perpetuity" },
  { value: "quantum-rose", label: "Quantum Rose" },
  { value: "retro-arcade", label: "Retro Arcade" },
  { value: "sage-garden", label: "Sage Garden" },
  { value: "soft-pop", label: "Soft Pop" },
  { value: "solar-dusk", label: "Solar Dusk" },
  { value: "starry-night", label: "Starry Night" },
  { value: "sunset-horizon", label: "Sunset Horizon" },
  { value: "supabase", label: "Supabase" },
  { value: "t3-chat", label: "T3 Chat" },
  { value: "tangerine", label: "Tangerine" },
  { value: "vercel", label: "Vercel" },
  { value: "vintage-paper", label: "Vintage Paper" },
  { value: "violet-bloom", label: "Violet Bloom" },
] as const;

export type ThemeColor = (typeof THEME_COLORS)[number]["value"];

function isThemeColor(value: string): value is ThemeColor {
  return THEME_COLORS.some((t) => t.value === value);
}

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  defaultThemeColor?: ThemeColor;
  themeColorStorageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themeColor: ThemeColor;
  setThemeColor: (themeColor: ThemeColor) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  themeColor: "indigo",
  setThemeColor: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "buildingai-ui-theme",
  defaultThemeColor = "indigo",
  themeColorStorageKey = "buildingai-ui-theme-color",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    return (localStorage.getItem(storageKey) as Theme) || defaultTheme;
  });

  const [themeColor, setThemeColor] = useState<ThemeColor>(() => {
    if (typeof window === "undefined") return defaultThemeColor;
    const stored = localStorage.getItem(themeColorStorageKey);
    if (!stored) return defaultThemeColor;

    const normalized = stored.trim();
    if (!normalized) return defaultThemeColor;

    return isThemeColor(normalized) ? normalized : defaultThemeColor;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = window.document.documentElement;

    const applyMode = () => {
      root.classList.remove("light", "dark");

      if (theme === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
        root.classList.add(systemTheme);
        return;
      }

      root.classList.add(theme);
    };

    applyMode();

    if (theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyMode();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    }

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = window.document.documentElement;

    // Keep only one `.theme-*` class on the root element.
    for (const c of Array.from(root.classList)) {
      if (c.startsWith("theme-")) root.classList.remove(c);
    }

    if (themeColor) root.classList.add(`theme-${themeColor}`);
  }, [themeColor]);

  const value = {
    theme,
    themeColor,
    setTheme: (theme: Theme) => {
      if (typeof window !== "undefined") localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
    setThemeColor: (themeColor: ThemeColor) => {
      if (typeof window !== "undefined")
        localStorage.setItem(themeColorStorageKey, themeColor as string);
      setThemeColor(themeColor);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
