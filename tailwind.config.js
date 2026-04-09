/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        navy: {
          900: 'hsl(222, 47%, 6%)',
          800: 'hsl(222, 44%, 9%)',
          700: 'hsl(222, 40%, 14%)',
          600: 'hsl(222, 35%, 18%)',
          500: 'hsl(215, 30%, 30%)',
        },
        cyan: {
          400: 'hsl(185, 100%, 50%)',
          300: 'hsl(185, 100%, 65%)',
          500: 'hsl(185, 100%, 40%)',
        },
        teal: {
          400: 'hsl(174, 72%, 56%)',
        },
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 245, 255, 0.15)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 245, 255, 0.35)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 2s infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
      },
      backgroundImage: {
        'hero-gradient': 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,245,255,0.08) 0%, transparent 70%)',
        'cyan-glow': 'radial-gradient(circle, rgba(0,245,255,0.15) 0%, transparent 70%)',
      },
      safelist: [
        'text-cyan-400', 'text-teal-400', 'text-green-400', 'text-yellow-400', 'text-red-400', 'text-blue-400',
        'text-amber-400', 'text-purple-400', 'text-pink-400', 'text-orange-400',
        'bg-cyan-400/10', 'bg-teal-400/10', 'bg-green-400/10', 'bg-yellow-400/10', 'bg-red-400/10',
        'bg-amber-400/10', 'bg-purple-400/10', 'bg-blue-400/10', 'bg-pink-400/10',
        'border-cyan-400/20', 'border-teal-400/20', 'border-blue-400/20', 'border-purple-400/20',
        'border-cyan-400/30', 'border-teal-400/30', 'border-green-400/30', 'border-amber-400/20',
        'border-pink-400/20', 'bg-pink-400/5', 'text-pink-400',
      ],
    },
  },
  plugins: [require("tailwindcss-animate")],
};