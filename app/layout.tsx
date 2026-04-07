import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    metadataBase: new URL("https://learn.quantumbtc.dev"),
    title: {
        default: "QuantumBTC | Secure Bitcoin's Future Against the Quantum Threat",
        template: "%s | QuantumBTC",
    },
    description: "QuantumBTC is the Quantum BTC research platform stress-testing the Lightning Network to fund post-quantum cryptographic research. Protecting Bitcoin from the quantum computing threat.",
    keywords: ["QuantumBTC", "Quantum BTC", "Bitcoin", "BTC", "Lightning Network", "LN", "Quantum Threat", "Post-Quantum Cryptography", "Stress-Test", "Satoshi Nakamoto", "Crypto Security", "quantum resistant bitcoin"],
    authors: [{ name: "QuantumBTC Team" }],
    icons: {
        icon: "/favicon.png",
        shortcut: "/favicon.png",
        apple: "/favicon.png",
    },
    openGraph: {
        title: "QuantumBTC | Secure Bitcoin's Future",
        description: "QuantumBTC is the Quantum BTC research initiative securing Bitcoin against the quantum computing threat. Non-custodial, Lightning Network powered, provably fair.",
        url: "https://learn.quantumbtc.dev",
        siteName: "QuantumBTC",
        images: [
            {
                url: "/og-image.png",
                width: 1200,
                height: 630,
                alt: "QuantumBTC — Securing Bitcoin Against the Quantum Threat",
            },
        ],
        locale: "en_US",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "QuantumBTC | Secure Bitcoin's Future",
        description: "QuantumBTC: the Quantum BTC platform stress-testing Lightning Network to fund post-quantum cryptography research and protect Satoshi's legacy.",
        images: ["/og-image.png"],
    },
    robots: {
        index: true,
        follow: true,
    },
    verification: {
        google: "V5GTFY-D1yaFjRdTapGS_nNUS15d4OQgd59-2pAMG9I",
    },
    alternates: {
        canonical: "/",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>{children}</body>
        </html>
    );
}

