/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0B1D3A',
          light: '#1A2E4D',
          50: '#F0F2F5',
        },
        coral: {
          DEFAULT: '#F85A3E',
          dark: '#E04A2F',
          50: '#FFF0ED',
        },
        'off-white': '#FAFAFA',
        'light-gray': '#F5F5F5',
        'mid-gray': '#E0E0E0',
        'text-gray': '#6B7280',
        'dark-gray': '#374151',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
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
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
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
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'hero': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'hero-mobile': ['2.25rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'hero-tablet': ['2.875rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'section': ['2.625rem', { lineHeight: '1.15', letterSpacing: '-0.01em', fontWeight: '700' }],
        'section-mobile': ['1.875rem', { lineHeight: '1.15', letterSpacing: '-0.01em', fontWeight: '700' }],
        'section-tablet': ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.01em', fontWeight: '700' }],
        'card-title': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        'subsection': ['1.25rem', { lineHeight: '1.35', fontWeight: '600' }],
        'body-large': ['1.125rem', { lineHeight: '1.6', fontWeight: '400' }],
        'caption': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        'small': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.02em', fontWeight: '500' }],
        'button': ['0.9375rem', { lineHeight: '1', fontWeight: '600' }],
        'nav': ['0.9375rem', { lineHeight: '1', fontWeight: '500' }],
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
        '3xl': '64px',
        '4xl': '96px',
        '5xl': '128px',
      },
      maxWidth: {
        'content': '1280px',
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        'nav': '0 2px 12px rgba(0,0,0,0.06)',
        'card': '0 12px 40px rgba(11,29,58,0.08)',
        'coral': '0 4px 16px rgba(248,90,62,0.35)',
        'coral-glow': '0 0 0 4px rgba(248,90,62,0.15)',
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
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        "bounce-chevron": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(8px)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(248,90,62,0)" },
          "50%": { boxShadow: "0 0 0 4px rgba(248,90,62,0.15)" },
        },
        "gradient-shift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        "bounce-chevron": "bounce-chevron 2s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "gradient-shift": "gradient-shift 15s ease infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
