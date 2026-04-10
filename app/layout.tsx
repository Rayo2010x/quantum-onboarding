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
    description: "QuantumBTC is the grassroots research platform stress-testing the Lightning Network to fund post-quantum cryptographic research. Protecting Bitcoin from the quantum computing threat.",
    keywords: ["QuantumBTC", "Quantum BTC", "Bitcoin", "BTC", "Lightning Network", "LN", "Quantum Threat", "Post-Quantum Cryptography", "Stress-Test", "Satoshi Nakamoto", "Crypto Security", "quantum resistant bitcoin"],
    authors: [{ name: "QuantumBTC Team" }],
    icons: {
        icon: "/favicon.png",
        shortcut: "/favicon.png",
        apple: "/favicon.png",
    },
    openGraph: {
        title: "QuantumBTC | Secure Bitcoin's Future",
        description: "QuantumBTC is the grassroots research initiative securing Bitcoin against the quantum computing threat. Non-custodial, Lightning Network powered, provably fair.",
        url: "https://learn.quantumbtc.dev",
        siteName: "QuantumBTC",
        images: [
            {
                url: "/og-image.webp",
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
        description: "QuantumBTC: the grassroots platform stress-testing the Lightning Network to fund post-quantum cryptography research and protect Satoshi's legacy.",
        images: ["/og-image.webp"],
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

const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "QuantumBTC",
    "alternateName": ["Quantum BTC", "QuantumBTC Dev", "Quantum Bitcoin"],
    "url": "https://learn.quantumbtc.dev",
    "logo": "https://learn.quantumbtc.dev/favicon.png",
    "sameAs": [
        "https://quantumbtc.dev",
        "https://x.com/QuantumBTCdev",
        "https://t.me/QuantumBTCDev",
        "https://discord.gg/v6a7zqn5qR",
        "https://github.com/Rayo2010x",
        "https://primal.net/p/nprofile1qqsvzhkrdx639mwh3srsuuk0rsecy8xankpwyhyy54kuu3xhfjw0tzgyxf46q"
    ],
    "description": "QuantumBTC is a grassroots initiative stress-testing the Lightning Network to fund post-quantum cryptographic research, protecting Bitcoin from the quantum computing threat."
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
                />
            </head>
            <body className={inter.className}>{children}</body>
        </html>
    );
}

