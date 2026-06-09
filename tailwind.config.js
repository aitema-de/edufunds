/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* UI System Colors */
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        /* Primary - Gold */
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          light: "hsl(var(--primary-light))",
          dark: "hsl(var(--primary-dark))",
        },
        
        /* Secondary - Navy */
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        
        /* Muted */
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        
        /* Accent - Teal */
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        
        /* Status Colors */
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        error: {
          DEFAULT: "hsl(var(--error))",
          foreground: "hsl(var(--error-foreground))",
        },
        
        /* Brand Color Scale - Gold */
        gold: {
          300: '#e4c55a',
          400: '#d4af37',
          500: '#c9a227',
          600: '#b08d1f',
          700: '#967814',
        },
        
        /* Navy Scale */
        navy: {
          950: '#050d18',
          900: '#0a1628',
          800: '#0f1f38',
          700: '#162a4a',
          600: '#1e3a61',
          500: '#2a4a7a',
        },
        
        /* Parchment Background */
        parchment: {
          DEFAULT: '#f8f5f0',
          dark: '#ebe5dc',
          light: '#fdfcfa',
        },
        
        /* Teal Accent */
        teal: {
          800: '#0d3333',
          700: '#1a4d4d',
          600: '#266666',
          500: '#338080',
        },
        
        /* Legacy Orange aliases - mapped to Gold for consistency */
        orange: {
          DEFAULT: '#c9a227',
          primary: '#c9a227',
          light: '#d4af37',
          dark: '#b08d1f',
        },
      },
      
      /* Border Radius */
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      
      /* Font Families */
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        serif: ['DM Serif Display', 'Georgia', 'serif'],
        mono: ['Fira Code', 'monospace'],
      },
      
      /* Custom Animations */
      animation: {
        'float': 'float 8s ease-in-out infinite',
        'float-delayed': 'float 10s ease-in-out infinite -3s',
        'float-slow': 'float 12s ease-in-out infinite -5s',
        'pulse-glow': 'pulse-glow 6s ease-in-out infinite',
        'shimmer': 'shimmer 3s ease-in-out infinite',
        'reveal-up': 'reveal-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'reveal-scale': 'reveal-scale 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-left': 'slide-in-left 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-right': 'slide-in-right 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-20px) rotate(2deg)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.05)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'reveal-up': {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'reveal-scale': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-40px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(40px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
      
      /* Box Shadows */
      boxShadow: {
        'gold': '0 12px 40px -10px rgba(201, 162, 39, 0.45)',
        'gold-sm': '0 4px 12px -2px rgba(201, 162, 39, 0.3)',
        'gold-lg': '0 20px 60px -15px rgba(201, 162, 39, 0.5)',
        'navy': '0 12px 40px -10px rgba(10, 22, 40, 0.35)',
      },
    },
  },
  plugins: [],
}
