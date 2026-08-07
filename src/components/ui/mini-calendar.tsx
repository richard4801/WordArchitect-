const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * A month-grid activity calendar (Today's Progress widget) — filled cells
 * mark writing days, a ringed cell marks today. Purely presentational: takes
 * an explicit day list rather than reading the real Date, so the mock
 * pattern renders identically on server and client.
 */
export function MiniCalendar({
  activeDays,
  today,
  totalDays = 30,
  startOffset = 3,
}: {
  activeDays: number[];
  today: number;
  totalDays?: number;
  startOffset?: number;
}) {
  const cells: (number | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  return (
    <div className="grid grid-cols-7 gap-1">
      {WEEKDAYS.map((d, i) => (
        <div key={i} className="label-caps text-center text-[0.55rem]">
          {d}
        </div>
      ))}
      {cells.map((day, i) => {
        if (day === null) return <div key={`b${i}`} />;
        const active = activeDays.includes(day);
        const isToday = day === today;
        return (
          <div
            key={day}
            className={`grid aspect-square place-items-center rounded-md text-[0.6rem] ${
              isToday
                ? "border border-gold font-medium text-gold"
                : active
                  ? "bg-gold/20 text-gold"
                  : "text-ink-faint"
            }`}
          >
            {day}
          </div>
        );
      })}
    </div>
  );
}
