import type { Metadata } from "next";
import Script from "next/script";
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
  title: "AirSync — Autonomous Fleet Availability & Predictive Maintenance Platform",
  description: "Ministry of Defence (MoD / DSSC) Air Power Predictive Maintenance, Edge-AI RUL Prognostics, 3D Digital Twin, and Sovereign Airworthiness Ledger",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full dark antialiased`}
    >
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* Global Invisible Scrollbars */
              html, body, #__next, * {
                scrollbar-width: none !important;
                -ms-overflow-style: none !important;
              }
              ::-webkit-scrollbar,
              *::-webkit-scrollbar,
              html::-webkit-scrollbar,
              body::-webkit-scrollbar {
                display: none !important;
                width: 0px !important;
                height: 0px !important;
                background: transparent !important;
                -webkit-appearance: none !important;
                opacity: 0 !important;
              }
              ::-webkit-scrollbar-thumb,
              *::-webkit-scrollbar-thumb {
                display: none !important;
                background: transparent !important;
              }
              ::-webkit-scrollbar-track,
              *::-webkit-scrollbar-track {
                display: none !important;
                background: transparent !important;
              }
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="bg-[#07090e] text-zinc-50 min-h-screen flex flex-col font-sans">
        {children}
        <Script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
