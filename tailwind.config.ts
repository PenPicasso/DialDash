import type { Config } from "tailwindcss";

const config: Config = {
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
                border: "var(--border)",
                accent: "var(--accent)",
                "accent-hover": "var(--accent-hover)",
                muted: "var(--muted)",
                "input-bg": "var(--input-bg)",
                placeholder: "var(--placeholder)",
                brand: {
                    orange: "#FE8007",
                    blue: "#113E80",
                },
            },
        },
    },
    plugins: [],
};
export default config;
