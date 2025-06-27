import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/components/Web3Provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mars Credit Network - DeFi on Mars",
  description: "Redeem MARS tokens and explore DeFi on our custom blockchain. Welcome to the future of decentralized finance on Mars Credit Network.",
  keywords: "Mars, MARS token, DeFi, blockchain, grants, Mars Credit Network",
  authors: [{ name: "Mars Credit Network" }],
  openGraph: {
    title: "Mars Credit Network - DeFi on Mars",
    description: "Redeem MARS tokens and explore DeFi on our custom blockchain",
    url: "https://defi.marscredit.xyz",
    siteName: "Mars Credit Network",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mars Credit Network - DeFi on Mars",
    description: "Redeem MARS tokens and explore DeFi on our custom blockchain",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#dc2626", // Mars red color
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-red-500 min-h-screen`}
      >
        <Web3Provider>
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}
