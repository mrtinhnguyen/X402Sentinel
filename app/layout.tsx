import type { Metadata } from "next";
import { ThirdwebProvider } from "thirdweb/react";
import localFont from "next/font/local";
import "./globals.css";

const polySansNeutral = localFont({
  src: "./fonts/PolySans Neutral.ttf",
  variable: "--font-poly-sans-neutral",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Avalanche Sentinel",
  description: "Real-time AI-powered risk intelligence and sentiment analysis platform for Avalanche tokens",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={polySansNeutral.variable} style={{ fontFamily: 'var(--font-poly-sans-neutral), sans-serif' }}>
      <body 
        className="antialiased font-sans" 
        style={{ fontFamily: 'var(--font-poly-sans-neutral), sans-serif' }}
      >
        <ThirdwebProvider>{children}</ThirdwebProvider>
      </body>
    </html>
  );
}
