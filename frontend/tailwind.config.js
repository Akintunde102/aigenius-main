/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "noboxbg": "url('/src/assets/nobox-bg.png')",
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        'gradient-primary': 'linear-gradient(135deg, hsl(250 84% 54%), hsl(280 100% 70%))',
        'gradient-subtle': 'linear-gradient(135deg, hsl(0 0% 3%), hsl(0 0% 6%))',
        'gradient-dark': 'linear-gradient(135deg, hsl(0 0% 3%), hsl(0 0% 8%))',
      },
      colors: {
        primary: "#3777FF",
        secondary: "#556DFF",
        dark: "#1C1B1B",
        neutral: "#496080",
        lightgray: "#C3CFE0",
        link: "#556DFF",
        authDark: "#0E1E40",
        opaque: "#D7E4FF",
        rowColor: "#6379A8",
        customInputBorder: "#87ADFF",
        borderCard: "#DDE3F0",
        tableHeadBgColor: "#ECEDF3",
        tableBorderColor: "#CACFF6",
        checkboxBg: "#ECEDF3",
        checkboxText: "#556DFF",
        danger: '#D02B20',
        // New design system colors
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        auth: {
          bg: 'hsl(var(--auth-bg))',
          sidebar: 'hsl(var(--auth-sidebar))',
          'sidebar-foreground': 'hsl(var(--auth-sidebar-foreground))'
        },
      },
      boxShadow: {
        'elegant': '0 10px 40px -10px hsl(0 0% 0% / 0.5)',
        'subtle': '0 1px 3px 0 hsl(0 0% 0% / 0.3)'
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)'
      },
      keyframes: {
        'fade-in': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        'float': {
          '0%, 100%': {
            transform: 'translateY(0px)'
          },
          '50%': {
            transform: 'translateY(-20px)'
          }
        },
        'float-delayed': {
          '0%, 100%': {
            transform: 'translateY(-10px)'
          },
          '50%': {
            transform: 'translateY(-30px)'
          }
        },
        'pulse-glow': {
          '0%, 100%': {
            opacity: '0.4',
            transform: 'scale(1)'
          },
          '50%': {
            opacity: '0.8',
            transform: 'scale(1.05)'
          }
        }
      },
      animation: {
        'fade-in': 'fade-in 0.6s ease-out',
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float-delayed 8s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 4s ease-in-out infinite'
      }
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
