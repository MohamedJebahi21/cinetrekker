import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GenreStat {
  name: string;
  count: number;
  hours: number;
}

interface EnhancedStatsChartsProps {
  genreStats: GenreStat[];
  isMobile: boolean;
  colors: string[];
  labels: {
    genreDistribution: string;
    hoursByGenre: string;
  };
}

export default function EnhancedStatsCharts({
  genreStats,
  colors,
  labels,
}: EnhancedStatsChartsProps) {
  const totalCount = genreStats.reduce((sum, item) => sum + item.count, 0);
  const maxHours = genreStats.reduce(
    (max, item) => (item.hours > max ? item.hours : max),
    0,
  );

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <Card className="ct-panel">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-foreground">
            {labels.genreDistribution}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {genreStats.map((entry, index) => {
              const percent = totalCount > 0 ? Math.round((entry.count / totalCount) * 100) : 0;

              return (
                <div key={entry.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{entry.name}</span>
                    <span className="text-muted-foreground">{entry.count} ({percent}%)</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-white/10">
                    <div
                      className="h-2.5 rounded-full transition-[width] duration-300"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: colors[index % colors.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="ct-panel">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-foreground">
            {labels.hoursByGenre}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {genreStats.map((entry) => {
              const percent = maxHours > 0 ? Math.round((entry.hours / maxHours) * 100) : 0;

              return (
                <div key={entry.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{entry.name}</span>
                    <span className="text-muted-foreground">{entry.hours.toFixed(1)}h</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-white/10">
                    <div
                      className="h-2.5 rounded-full bg-[#E50914] transition-[width] duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
