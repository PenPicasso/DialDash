import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class",
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                panel: "var(--panel)",
                "panel-hover": "var(--panel-hover)",
                border: "var(--border)",
                "border-subtle": "var(--border-subtle)",
                accent: "var(--accent)",
                "accent-hover": "var(--accent-hover)",
                "accent-soft": "var(--accent-soft)",
                muted: "var(--muted)",
                "muted-soft": "var(--muted-soft)",
                success: "var(--success)",
                "success-soft": "var(--success-soft)",
                info: "var(--info)",
                "info-soft": "var(--info-soft)",
                warning: "var(--warning)",
                "warning-soft": "var(--warning-soft)",
                danger: "var(--danger)",
                "danger-soft": "var(--danger-soft)",
            },
        },
    },
    plugins: [],
};
export default config;
