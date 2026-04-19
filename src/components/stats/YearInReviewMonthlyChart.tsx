interface MonthlyItem {
  month: string;
  count: number;
}

export default function YearInReviewMonthlyChart({
  data,
}: {
  data: MonthlyItem[];
}) {
  const maxCount = data.reduce(
    (max, item) => (item.count > max ? item.count : max),
    0,
  );

  return (
    <div className="h-[360px] overflow-y-auto pr-1">
      <div className="space-y-3">
        {data.map((item) => {
          const percent = maxCount > 0 ? Math.round((item.count / maxCount) * 100) : 0;

          return (
            <div key={item.month} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{item.month}</span>
                <span className="text-muted-foreground">{item.count}</span>
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
    </div>
  );
}
