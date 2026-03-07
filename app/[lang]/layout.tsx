import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Quantum BTC | The Ultimate Lightning Network Stress-Test",
    description: "Educational onboarding portal for Quantum BTC. Learn about Bitcoin, Lightning Network layers, and post-quantum research funding.",
};

export async function generateStaticParams() {
    return [{ lang: "en" }, { lang: "es" }];
}

export default function RootLayout({
    children,
    params,
}: Readonly<{
    children: React.ReactNode;
    params: { lang: string };
}>) {
    return (
        <html lang={params.lang}>
            <body className={inter.className}>{children}</body>
        </html>
    );
}
