import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "SettleMate",
  title: "SettleMate - 朋友分帳工具",
  description: "建立群組、邀請朋友、記錄支出，最後用最少筆轉帳結清。",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "SettleMate",
    statusBarStyle: "default",
    startupImage: "/assets/app-cover-settlemate-style.png",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/assets/app-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/assets/app-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/assets/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#f8fafc",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-Hant"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
