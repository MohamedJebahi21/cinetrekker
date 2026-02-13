import React from 'react';
import { Link } from 'react-router-dom';
import { Film, Calendar, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SEO from '@/components/SEO';

interface Collection {
  id: string;
  title: string;
  description: string;
  items: { id: number; type: 'movie' | 'tv'; title: string }[];
  totalRuntime?: number;
  icon: string;
}

const COLLECTIONS: Collection[] = [
  {
    id: 'mcu-chronological',
    title: 'MCU Chronological Order',
    description: 'Watch the Marvel Cinematic Universe in timeline order',
    icon: '🦸',
    totalRuntime: 3000,
    items: [
      { id: 1771, type: 'movie', title: 'Captain America: The First Avenger' },
      { id: 299536, type: 'movie', title: 'Captain Marvel' },
      { id: 10138, type: 'movie', title: 'Iron Man' },
      // Add more MCU movies...
    ],
  },
  {
    id: 'star-wars',
    title: 'Star Wars Saga',
    description: 'The complete Star Wars storyline',
    icon: '⭐',
    totalRuntime: 1500,
    items: [
      { id: 11, type: 'movie', title: 'Star Wars: Episode I' },
      { id: 1893, type: 'movie', title: 'Star Wars: Episode II' },
      // Add more Star Wars movies...
    ],
  },
  {
    id: 'bond',
    title: 'James Bond Marathon',
    description: 'All 007 movies in order',
    icon: '🕴️',
    totalRuntime: 3000,
    items: [],
  },
  {
    id: 'pixar',
    title: 'Pixar Collection',
    description: 'Every Pixar animated feature',
    icon: '🎨',
    totalRuntime: 2000,
    items: [],
  },
  {
    id: 'tarantino',
    title: 'Tarantino Filmography',
    description: 'Quentin Tarantino complete works',
    icon: '🎬',
    totalRuntime: 1200,
    items: [],
  },
  {
    id: 'nolan',
    title: 'Christopher Nolan Collection',
    description: 'All films directed by Christopher Nolan',
    icon: '🎞️',
    totalRuntime: 1500,
    items: [],
  },
  {
    id: 'ghibli',
    title: 'Studio Ghibli Masterpieces',
    description: 'Essential Studio Ghibli films',
    icon: '🌸',
    totalRuntime: 1000,
    items: [],
  },
  {
    id: 'lotr',
    title: 'Middle-earth Saga',
    description: 'Lord of the Rings & Hobbit extended editions',
    icon: '💍',
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
      <div className="page-container pt-20">
        <h1 className="section-title">Collections & Marathons</h1>
        <p className="text-muted-foreground mb-8">
          Pre-made watch orders and curated collections for the ultimate viewing experience
        </p>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {COLLECTIONS.map((collection) => (
            <Card key={collection.id} className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader>
                <div className="text-4xl mb-2">{collection.icon}</div>
                <CardTitle className="text-lg">{collection.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{collection.description}</p>

                <div className="flex flex-wrap gap-2">
                  {collection.items.length > 0 && (
                    <Badge variant="secondary" className="gap-1">
                      <Film className="h-3 w-3" />
                      {collection.items.length} titles
                    </Badge>
                  )}
                  {collection.totalRuntime && (
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {Math.round(collection.totalRuntime / 60)}h
                    </Badge>
                  )}
                </div>

                {collection.items.length > 0 && (
                  <div className="text-xs text-muted-foreground pt-2">
                    Starting with: {collection.items[0].title}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
