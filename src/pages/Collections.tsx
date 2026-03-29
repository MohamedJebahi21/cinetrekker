import React from "react";
import { Link } from "react-router-dom";
import { Film, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";

interface Collection {
  id: string;
  title: string;
  description: string;
  items: { id: number; type: "movie" | "tv"; title: string }[];
  totalRuntime?: number;
  icon: string;
}

const COLLECTIONS: Collection[] = [
  {
    id: "mcu-chronological",
    title: "MCU Chronological Order",
    description: "Watch the Marvel Cinematic Universe in timeline order",
    icon: "🦸",
    totalRuntime: 3000,
    items: [
      { id: 1771, type: "movie", title: "Captain America: The First Avenger" },
      { id: 299536, type: "movie", title: "Captain Marvel" },
      { id: 10138, type: "movie", title: "Iron Man" },
    ],
  },
  {
    id: "star-wars",
    title: "Star Wars Saga",
    description: "The complete Star Wars storyline",
    icon: "⭐",
    totalRuntime: 1500,
    items: [
      { id: 11, type: "movie", title: "Star Wars: Episode I" },
      { id: 1893, type: "movie", title: "Star Wars: Episode II" },
    ],
  },
  {
    id: "bond",
    title: "James Bond Marathon",
    description: "All 007 movies in order",
    icon: "🕴️",
    totalRuntime: 3000,
    items: [],
  },
  {
    id: "pixar",
    title: "Pixar Collection",
    description: "Every Pixar animated feature",
    icon: "🎨",
    totalRuntime: 2000,
    items: [],
  },
  {
    id: "tarantino",
    title: "Tarantino Filmography",
    description: "Quentin Tarantino complete works",
    icon: "🎬",
    totalRuntime: 1200,
    items: [],
  },
  {
    id: "nolan",
    title: "Christopher Nolan Collection",
    description: "All films directed by Christopher Nolan",
    icon: "🎞️",
    totalRuntime: 1500,
    items: [],
  },
  {
    id: "ghibli",
    title: "Studio Ghibli Masterpieces",
    description: "Essential Studio Ghibli films",
    icon: "🌸",
    totalRuntime: 1000,
    items: [],
  },
  {
    id: "lotr",
    title: "Middle-earth Saga",
    description: "Lord of the Rings & Hobbit extended editions",
    icon: "💍",
    totalRuntime: 1200,
    items: [],
  },
];

export default function Collections() {
  return (
    <>
      <SEO
        title="Collections & Marathons — CineTrekker"
        description="Curated collections and watch orders for franchise marathons"
        canonical="https://cinetrekker.vercel.app/collections"
      />
      <div className="page-container pt-20 pb-24 md:pb-0">
        <h1 className="section-title">Collections & Marathons</h1>
        <p className="text-muted-foreground mb-8">
          Pre-made watch orders and curated collections for the ultimate viewing
          experience
        </p>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {COLLECTIONS.map((collection) => (
            <Link
              key={collection.id}
              to={
                collection.items.length > 0
                  ? `/${collection.items[0].type}/${collection.items[0].id}`
                  : `/search?q=${encodeURIComponent(collection.title)}`
              }
              className="block"
            >
              <Card className="cursor-pointer transition-colors hover:bg-accent/50">
                <CardHeader>
                  <div className="text-4xl mb-2">{collection.icon}</div>
                  <CardTitle className="text-lg">{collection.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {collection.description}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <Film className="h-3 w-3" />
                      {collection.items.length} titles
                    </Badge>
                    {collection.totalRuntime && (
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {Math.round(collection.totalRuntime / 60)}h
                      </Badge>
                    )}
                  </div>

                  {collection.items.length > 0 ? (
                    <>
                      <div className="text-xs text-muted-foreground pt-2">
                        Starting with: {collection.items[0].title}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="px-0"
                      >
                        Open Collection <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 py-6">
                      <div className="w-10 h-10 flex items-center justify-center rounded-full bg-muted">
                        <Film className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div className="text-xs text-muted-foreground max-w-xs text-center">
                        This collection is being curated. Open search to start building it.
                      </div>
                      <Button
                        asChild
                        variant="secondary"
                        size="sm"
                        className="mt-2"
                      >
                        <Link to={`/search?q=${encodeURIComponent(collection.title)}`}>
                          Start Building <ArrowRight className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
