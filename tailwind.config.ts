import type { Config } from "tailwindcss";

// CheckGrow palette. Tailwind's named colour families are remapped onto it so
// existing utilities (green-500, amber-500, slate-400, ...) render in brand
// colours instead of stock hues.
const success = {
  50: "#EAF7F0", 100: "#D4F0E3", 200: "#A9E0C7", 300: "#7ECFAB", 400: "#52BC8F",
  500: "#3DAA74", 600: "#2F8F60", 700: "#1E7A4F", 800: "#175E3D", 900: "#10412B", 950: "#0A2B1C",
};
const warning = {
  50: "#FFF8E8", 100: "#FEF3D8", 200: "#FCE4AC", 300: "#FAD37E", 400: "#F8BE50",
  500: "#F5A623", 600: "#D48A13", 700: "#A06A00", 800: "#7A5100", 900: "#523600", 950: "#362300",
};
const error = {
  50: "#FDF2F2", 100: "#FDEAEA", 200: "#F8C9CB", 300: "#F1A2A5", 400: "#EB777B",
  500: "#E5484D", 600: "#C0252A", 700: "#9E1F23", 800: "#7A181B", 900: "#521012", 950: "#36090B",
};
const periwinkle = {
  50: "#F0F3FF", 100: "#E4EAFD", 200: "#C9D2FB", 300: "#B2BDFA", 400: "#9BA6FF",
  500: "#8A96F0", 600: "#5B67D8", 700: "#4652B4", 800: "#343D8A", 900: "#232A5E", 950: "#161B3E",
};
const neutral = {
  50: "#F7F7F5", 100: "#F2F2EF", 200: "#ECECE9", 300: "#D9D9D5", 400: "#9B9B9B",
  500: "#6F6F73", 600: "#3F3F47", 700: "#34333A", 800: "#2A2722", 900: "#1A1814", 950: "#0F0E0C",
};

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: { DEFAULT: "hsl(var(--success))", ...success },
        warning: { DEFAULT: "hsl(var(--warning))", ...warning },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Brand remaps of Tailwind's stock families
        green: success,
        emerald: success,
        teal: success,
        lime: success,
        amber: warning,
        yellow: warning,
        orange: warning,
        red: error,
        rose: error,
        pink: error,
        blue: periwinkle,
        indigo: periwinkle,
        violet: periwinkle,
        purple: periwinkle,
        sky: periwinkle,
        cyan: periwinkle,
        fuchsia: periwinkle,
        slate: neutral,
        zinc: neutral,
        gray: neutral,
        stone: neutral,
        neutral,
      },
      borderRadius: {
        sm: "0.25rem",   // 4px badges, chips, table cells
        md: "0.5rem",    // 8px buttons, inputs
        lg: "0.5rem",    // 8px (shadcn alias)
        xl: "1rem",      // 16px cards
        "2xl": "1rem",   // 16px cards, modals, panels
        "3xl": "1rem",
        "4xl": "1rem",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(42, 39, 34, 0.06)",
        DEFAULT: "0 1px 2px 0 rgba(42, 39, 34, 0.06)",
        md: "0 4px 12px 0 rgba(42, 39, 34, 0.08)",
        lg: "0 8px 24px 0 rgba(42, 39, 34, 0.10)",
        xl: "0 16px 48px 0 rgba(42, 39, 34, 0.12)",
        "2xl": "0 16px 48px 0 rgba(42, 39, 34, 0.12)",
        glow: "0 0 0 2px hsl(var(--primary))",
      },
      fontFamily: {
        sans: ["Geist", "system-ui", "-apple-system", "sans-serif"],
        display: ["Geist", "system-ui", "-apple-system", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        caption: ["0.75rem", { lineHeight: "1.4" }],
        small: ["0.875rem", { lineHeight: "1.5" }],
        body: ["1rem", { lineHeight: "1.6" }],
        "body-lg": ["1.125rem", { lineHeight: "1.6" }],
        h4: ["1.375rem", { lineHeight: "1.3", fontWeight: "600" }],
        h3: ["1.75rem", { lineHeight: "1.25", fontWeight: "600" }],
        h2: ["2.25rem", { lineHeight: "1.2", fontWeight: "600" }],
        h1: ["3rem", { lineHeight: "1.15", fontWeight: "700" }],
        display: ["4rem", { lineHeight: "1.1", fontWeight: "700" }],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
