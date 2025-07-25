import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/components/Web3Provider";

// Solana wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

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
  icons: {
    icon: [
      { url: "/marscredit_square_transparent_256.png", sizes: "256x256", type: "image/png" },
      { url: "/marscredit_square_transparent_256.png", sizes: "32x32", type: "image/png" },
      { url: "/marscredit_square_transparent_256.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/marscredit_square_transparent_256.png",
  },
  openGraph: {
    title: "Mars Credit Network - DeFi on Mars",
    description: "Redeem MARS tokens and explore DeFi on our custom blockchain",
    url: "https://defi.marscredit.xyz",
    siteName: "Mars Credit Network",
    type: "website",
    images: [
      {
        url: "/marscredit_logo.png",
        width: 1200,
        height: 630,
        alt: "Mars Credit Network",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mars Credit Network - DeFi on Mars",
    description: "Redeem MARS tokens and explore DeFi on our custom blockchain",
    images: ["/marscredit_logo.png"],
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
