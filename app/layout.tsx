import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: {
        default: "Quantum BTC | Lightning Network Stress-Test & Post-Quantum Security",
        template: "%s | Quantum BTC",
    },
    description: "Join the ultimate Bitcoin Lightning Network stress-test. Learn about the quantum threat to ECDSA and help fund post-quantum cryptographic research while experimenting with micro-payments.",
    keywords: ["Bitcoin", "BTC", "Lightning Network", "LN", "Quantum Threat", "Post-Quantum Cryptography", "Stress-Test", "Satoshi Nakamoto", "Crypto Security"],
    authors: [{ name: "Quantum BTC Team" }],
    openGraph: {
        title: "Quantum BTC | The Ultimate Lightning Network Stress-Test",
        description: "Experiment with Bitcoin's layer 2 and secure the future against quantum attacks.",
        url: "https://quantumbtc.dev",
        siteName: "Quantum BTC",
        images: [
            {
                url: "/og-image.png",
                width: 1200,
                height: 630,
                alt: "Quantum BTC - Lightning Network Stress-Test",
            },
        ],
        locale: "en_US",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Quantum BTC | Secure Bitcoin's Future",
        description: "Testing Lightning Network scalability to fund quantum-resistant research.",
        images: ["/og-image.png"],
    },
    robots: {
        index: true,
        follow: true,
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
