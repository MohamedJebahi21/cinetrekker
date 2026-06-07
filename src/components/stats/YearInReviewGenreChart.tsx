interface GenreItem {
  name: string;
  value: number;
}

const COLORS = ["#E50914", "#ff6b73", "#f97316", "#f59e0b", "#fb7185"];

export default function YearInReviewGenreChart({ data }: { data: GenreItem[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="h-[360px] overflow-y-auto pr-1">
      <div className="space-y-3">
        {data.map((entry, index) => {
          const percent = total > 0 ? Math.round((entry.value / total) * 100) : 0;

          return (
            <div key={entry.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{entry.name}</span>
                <span className="text-muted-foreground">{entry.value} ({percent}%)</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-white/10">
                <div
                  className="h-2.5 rounded-full transition-[width] duration-300"
                  style={{
                    width: `${percent}%`,
                    backgroundColor: COLORS[index % COLORS.length],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
