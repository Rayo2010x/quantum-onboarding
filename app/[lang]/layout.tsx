import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata({ params }: { params: { lang: string } }): Promise<Metadata> {
    return {
        title: {
            default: "QuantumBTC | Lightning Network Stress-Test & Post-Quantum Security",
            template: "%s | QuantumBTC",
        },
        description: "Join the ultimate Bitcoin Lightning Network stress-test. Learn about the quantum threat to ECDSA and help fund post-quantum cryptographic research while experimenting with micro-payments.",
        verification: {
            google: "V5GTFY-D1yaFjRdTapGS_nNUS15d4OQgd59-2pAMG9I",
        },
        alternates: {
            canonical: `/${params.lang}`,
            languages: {
                en: "/en",
                es: "/es",
            },
        },
    };
}

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
