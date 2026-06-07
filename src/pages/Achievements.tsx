import React from 'react';
import { useUserLists } from '@/contexts/user-lists-context';
import { calculateAchievements, getAchievementProgress } from '@/lib/achievements';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Lock, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import SEO from '@/components/SEO';

export default function Achievements() {
  const { watched, watchlist } = useUserLists();
  const achievements = calculateAchievements(watched, watchlist);
  const progress = getAchievementProgress(achievements);

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'bronze':
        return 'bg-amber-700 text-white';
      case 'silver':
        return 'bg-gray-400 text-black';
      case 'gold':
        return 'bg-yellow-500 text-black';
      case 'platinum':
        return 'bg-purple-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  return (
    <>
      <SEO
        title="Achievements — CineTrekker"
        description="Track your watching achievements and milestones"
        canonical="https://cinetrekker.vercel.app/achievements"
      />
      <div className="page-container pt-20 pb-24 md:pb-0">
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="h-8 w-8" />
          <h1 className="section-title mb-0">Achievements</h1>
        </div>

        {/* Overall Progress */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Overall Progress</span>
              <Badge variant="secondary" className="text-lg">
                {progress.unlocked} / {progress.total}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progress.percentage} className="h-3 mb-2" />
            <p className="text-sm text-muted-foreground text-center">{progress.percentage}% Complete</p>
          </CardContent>
        </Card>

        {/* Achievement Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {achievements.map((achievement) => (
            <Card
              key={achievement.id}
              className={cn(
                'relative overflow-hidden transition-all',
                achievement.unlocked
                  ? 'border-primary/50 bg-primary/5'
                  : 'opacity-70 grayscale hover:opacity-90'
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="text-4xl">{achievement.icon}</div>
                  {achievement.tier && (
                    <Badge className={getTierColor(achievement.tier)}>{achievement.tier}</Badge>
                  )}
                </div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {achievement.title}
                  {!achievement.unlocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{achievement.description}</p>

                {achievement.target && achievement.progress !== undefined && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Progress</span>
                      <span>
                        {achievement.progress} / {achievement.target}
                      </span>
                    </div>
                    <Progress
                      value={(achievement.progress / achievement.target) * 100}
                      className="h-2"
                    />
                  </div>
                )}

                {achievement.unlocked && achievement.unlockedAt && (
                  <p className="text-xs text-muted-foreground">
                    Unlocked: {new Date(achievement.unlockedAt).toLocaleDateString()}
                  </p>
                )}
              </CardContent>

              {achievement.unlocked && (
                <div className="absolute top-0 right-0 p-2">
                  <Award className="h-6 w-6 text-yellow-500" />
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
