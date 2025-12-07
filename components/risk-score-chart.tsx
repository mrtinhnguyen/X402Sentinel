"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RiskScoreChartProps {
  riskScore: number; // 0-100
  recommendation: "BUY" | "HOLD" | "SELL" | "AVOID";
  breakdown?: {
    onChainScore: number;
    socialScore: number;
    technicalScore: number;
  };
}

export function RiskScoreChart({ riskScore, recommendation, breakdown }: RiskScoreChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 2 - 30;

    // Animate the pie chart
    let currentScore = 0;
    const targetScore = riskScore;
    const animationDuration = 2000; // 2 seconds
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      // Ease out animation
      currentScore = targetScore * (1 - Math.pow(1 - progress, 3));
      setAnimatedScore(Math.round(currentScore));

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#f3f4f6";
      ctx.fill();
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw risk score arc
      const angle = (currentScore / 100) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + angle);
      ctx.closePath();
      
      // Color based on score
      if (currentScore >= 70) {
        ctx.fillStyle = "#10b981"; // Green
      } else if (currentScore >= 40) {
        ctx.fillStyle = "#f59e0b"; // Yellow
      } else {
        ctx.fillStyle = "#ef4444"; // Red
      }
      ctx.fill();

      // Draw text with white color for dark theme
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 48px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${Math.round(currentScore)}%`, centerX, centerY - 20);

      ctx.font = "bold 20px Arial";
      ctx.fillText(recommendation, centerX, centerY + 30);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [riskScore, recommendation]);

  const getRecommendationColor = () => {
    switch (recommendation) {
      case "BUY":
        return "text-green-400 bg-green-500/20 border-green-500/50";
      case "HOLD":
        return "text-yellow-400 bg-yellow-500/20 border-yellow-500/50";
      case "SELL":
        return "text-orange-400 bg-orange-500/20 border-orange-500/50";
      case "AVOID":
        return "text-red-400 bg-red-500/20 border-red-500/50";
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col items-center">
        <canvas
          ref={canvasRef}
          width={300}
          height={300}
          className="rounded-full drop-shadow-2xl"
        />
        <div className={`mt-4 px-6 py-2 rounded-full border backdrop-blur-sm ${getRecommendationColor()}`}>
          <span className="font-bold text-lg">{recommendation}</span>
        </div>
      </div>

      {breakdown && (
        <div className="space-y-3 pt-4 border-t border-white/20">
          <h3 className="font-semibold text-sm text-white/80">Score Breakdown</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/70">On-Chain</span>
                <span className="font-medium text-white">{breakdown.onChainScore}/100</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-500 h-2.5 rounded-full transition-all duration-1000 ease-out shadow-lg"
                  style={{ width: `${breakdown.onChainScore}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/70">Social Sentiment</span>
                <span className="font-medium text-white">{breakdown.socialScore}/100</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-purple-500 h-2.5 rounded-full transition-all duration-1000 ease-out shadow-lg"
                  style={{ width: `${breakdown.socialScore}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/70">Technical</span>
                <span className="font-medium text-white">{breakdown.technicalScore}/100</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-indigo-500 h-2.5 rounded-full transition-all duration-1000 ease-out shadow-lg"
                  style={{ width: `${breakdown.technicalScore}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




