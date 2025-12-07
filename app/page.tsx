"use client";

import { createThirdwebClient } from "thirdweb";
import { ConnectButton } from "thirdweb/react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import heroImage from "./assets/hero.jpg";

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

export default function Home() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src={heroImage}
          alt="Sentinel Hero Background"
          fill
          className="object-cover"
          priority
        />
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto py-12">
        <div className="mb-8">
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold text-white mb-6 tracking-tight drop-shadow-2xl">
            Sentinel
          </h1>
          
          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white/90 mb-12 max-w-3xl mx-auto leading-relaxed drop-shadow-lg">
            AI-powered risk intelligence and slippage protection for Avalanche tokens. 
            Make informed trading decisions with real-time analysis and safe swap recommendations.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <Link href="/analysis">
            <Button 
              size="lg" 
              className="w-full sm:w-auto px-8 py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              Token Analysis
            </Button>
          </Link>
          <Link href="/slippage">
            <Button 
              size="lg" 
              variant="outline"
              className="w-full sm:w-auto px-8 py-6 text-lg bg-white/10 hover:bg-white/20 text-white border-2 border-white/50 hover:border-white backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              Slippage Sentinel
            </Button>
          </Link>
        </div>

        {/* Wallet Connect */}
        <div className="mt-8 flex justify-center">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-2">
            <ConnectButton client={client} />
          </div>
        </div>
      </div>
    </div>
  );
}
