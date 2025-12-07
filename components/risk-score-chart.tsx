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

      // Draw text
      ctx.fillStyle = "#1f2937";
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
        return "text-green-600 bg-green-50 border-green-200";
      case "HOLD":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "SELL":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "AVOID":
        return "text-red-600 bg-red-50 border-red-200";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Risk Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center">
          <canvas
            ref={canvasRef}
            width={300}
            height={300}
            className="rounded-full"
          />
          <div className={`mt-4 px-4 py-2 rounded-full border ${getRecommendationColor()}`}>
            <span className="font-bold text-lg">{recommendation}</span>
          </div>
        </div>

        {breakdown && (
          <div className="space-y-3 pt-4 border-t">
            <h3 className="font-semibold text-sm text-muted-foreground">Score Breakdown</h3>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>On-Chain</span>
                  <span className="font-medium">{breakdown.onChainScore}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${breakdown.onChainScore}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Social Sentiment</span>
                  <span className="font-medium">{breakdown.socialScore}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${breakdown.socialScore}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Technical</span>
                  <span className="font-medium">{breakdown.technicalScore}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${breakdown.technicalScore}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}




