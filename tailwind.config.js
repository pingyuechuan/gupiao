/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 涨跌（A股惯例：涨红跌绿）
        up: '#ff5470',
        down: '#19c37d',
        // 深色背景层级
        ink: {
          900: '#06080f',
          800: '#0a0e18',
          700: '#10141f',
          600: '#161b29',
          500: '#1d2233',
        },
        // 玻璃面板
        glass: 'rgba(255,255,255,0.045)',
        'glass-strong': 'rgba(255,255,255,0.07)',
        line: 'rgba(255,255,255,0.08)',
        // 强调色（青→蓝→紫）
        accent: {
          DEFAULT: '#5b8cff',
          cyan: '#37e6c9',
          violet: '#a06bff',
        },
        txt: {
          DEFAULT: '#e8ebf2',
          dim: '#8b93a7',
          faint: '#5a6478',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'PingFang SC',
          'Microsoft YaHei',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        glass: '0 8px 32px -8px rgba(0,0,0,0.55), inset 0 1px 0 0 rgba(255,255,255,0.06)',
        glow: '0 0 24px -4px rgba(91,140,255,0.55)',
        'glow-cyan': '0 0 24px -4px rgba(55,230,201,0.5)',
      },
      backgroundImage: {
        'accent-grad': 'linear-gradient(135deg,#37e6c9 0%,#5b8cff 45%,#a06bff 100%)',
        'glass-grad': 'linear-gradient(160deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
        'radial-glow': 'radial-gradient(1200px 600px at 80% -10%, rgba(91,140,255,0.18), transparent 60%)',
      },
      borderRadius: {
        xl: '16px',
        '2xl': '20px',
        '3xl': '26px',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-soft': {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'gradient-x': {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        float: 'float 5s ease-in-out infinite',
        'gradient-x': 'gradient-x 6s ease infinite',
      },
    },
  },
  plugins: [],
};
