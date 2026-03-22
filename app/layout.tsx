import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Energy Dial Dashboard",
    description: "Internal clip intelligence system for the Energy Dial project",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="antialiased">{children}</body>
        </html>
    );
}
