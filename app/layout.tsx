import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    metadataBase: new URL("https://learn.quantumbtc.dev"),
    title: {
        default: "QuantumBTC | Lightning Network Stress-Test & Post-Quantum Security",
        template: "%s | QuantumBTC",
    },
    description: "Join the ultimate Bitcoin Lightning Network stress-test. Learn about the quantum threat to ECDSA and help fund post-quantum cryptographic research while experimenting with micro-payments.",
    keywords: ["Bitcoin", "BTC", "Lightning Network", "LN", "Quantum Threat", "Post-Quantum Cryptography", "Stress-Test", "Satoshi Nakamoto", "Crypto Security"],
    authors: [{ name: "QuantumBTC Team" }],
    openGraph: {
        title: "QuantumBTC | The Ultimate Lightning Network Stress-Test",
        description: "Experiment with Bitcoin's layer 2 and secure the future against quantum attacks.",
        url: "https://learn.quantumbtc.dev",
        siteName: "QuantumBTC",
        images: [
            {
                url: "/og-image.png",
                width: 1200,
                height: 630,
                alt: "QuantumBTC - Lightning Network Stress-Test",
            },
        ],
        locale: "en_US",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "QuantumBTC | Secure Bitcoin's Future",
        description: "Testing Lightning Network scalability to fund quantum-resistant research.",
        images: ["/og-image.png"],
    },
    robots: {
        index: true,
        follow: true,
    },
    verification: {
        google: "V5GTFY-D1yaFjRdTapGS_nNUS15d4OQgd59-2pAMG9I",
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
