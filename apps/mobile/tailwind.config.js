/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
    presets: [require('nativewind/preset')],
    theme: {
        extend: {
            colors: {
                primary: '#4f46e5',
                'primary-foreground': '#ffffff',
                secondary: '#10b981',
                destructive: '#ef4444',
                muted: '#6b7280',
                background: '#f9fafb',
                card: '#ffffff',
                border: '#e5e7eb',
                foreground: '#111827',
            },
            fontFamily: {
                sans: ['Inter', 'System'],
                poppins: ['Poppins', 'System'],
            },
        },
    },
    plugins: [],
};
