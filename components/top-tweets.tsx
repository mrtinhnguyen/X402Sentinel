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
    <Card>
      <CardHeader>
        <CardTitle>Top Tweets</CardTitle>
        <CardDescription>Most engaging tweets about this token</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tweets.map((tweet) => (
            <div
              key={tweet.id}
              className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <p className="text-sm mb-3 leading-relaxed">{tweet.text}</p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
                    <span className="text-muted-foreground">
                      {formatDate(tweet.createdAt)}
                    </span>
                  )}
                </div>
                
                <a
                  href={`https://twitter.com/i/web/status/${tweet.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
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



