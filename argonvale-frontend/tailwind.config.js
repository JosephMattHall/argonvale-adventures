/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#8b5cf6',      // Purple
                'primary-dark': '#7c3aed',
                gold: '#fbbf24',         // Gold accent
                'gold-dark': '#f59e0b',
                danger: '#ef4444',       // Red
                'danger-dark': '#dc2626',
                success: '#10b981',      // Green
                'success-dark': '#059669',
                dark: '#0f172a',         // Dark blue-gray
                'dark-lighter': '#1e293b',
                'card-bg': '#1e293b',    // Card background
                'card-hover': '#334155',
                border: '#475569',
                'border-subtle': '#334155',
            },
            fontFamily: {
                medieval: ['Cinzel', 'serif'],
                body: ['Inter', 'sans-serif'],
            },
            boxShadow: {
                'glow': '0 0 20px rgba(139, 92, 246, 0.5)',
                'glow-gold': '0 0 20px rgba(251, 191, 36, 0.5)',
            },
        },
    },
    plugins: [],
}
