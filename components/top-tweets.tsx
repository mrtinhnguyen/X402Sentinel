"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Repeat2, MessageCircle, ExternalLink } from "lucide-react";

interface Tweet {
  id: string;
  text: string;
  likes: number;
  retweets: number;
  replies: number;
  createdAt?: string;
}

interface TopTweetsProps {
  tweets: Tweet[];
}

export function TopTweets({ tweets }: TopTweetsProps) {
  if (!tweets || tweets.length === 0) {
    return null;
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-2xl">
      <CardHeader>
        <CardTitle className="text-white">Top Tweets</CardTitle>
        <CardDescription className="text-white/70">Most engaging tweets about this token</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tweets.map((tweet, index) => (
            <div
              key={tweet.id}
              className="p-4 border border-white/20 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-300 animate-in fade-in slide-in-from-left"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <p className="text-sm mb-3 leading-relaxed text-white/90">{tweet.text}</p>
              
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-4 text-xs text-white/70">
                  <div className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    <span>{tweet.likes.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Repeat2 className="h-3 w-3" />
                    <span>{tweet.retweets.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    <span>{tweet.replies.toLocaleString()}</span>
                  </div>
                  {tweet.createdAt && (
                    <span className="text-white/60">
                      {formatDate(tweet.createdAt)}
                    </span>
                  )}
                </div>
                
                <a
                  href={`https://twitter.com/i/web/status/${tweet.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  View <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}



