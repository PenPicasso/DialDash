import "./globals.css";
import type { Metadata } from "next";
import { Agentation } from "agentation";

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
            <body className="antialiased">
                {children}
                {process.env.NODE_ENV === "development" && <Agentation />}
            </body>
        </html>
    );
}
