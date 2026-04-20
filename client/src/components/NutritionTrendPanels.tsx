import {
  roundValue,
  type NutritionProgressBucket,
} from "../lib/meal-log";

const CHART_WIDTH = 360;
const CHART_HEIGHT = 116;
const CHART_PADDING_X = 10;
const CHART_PADDING_Y = 10;

function formatShortDate(date: string): string {
  if (!date) {
    return "--";
  }

  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "numeric",
    day: "numeric",
  });
}

function createLinePath(values: number[]): string {
  if (values.length === 0) {
    return "";
  }

  const chartWidth = CHART_WIDTH - CHART_PADDING_X * 2;
  const chartHeight = CHART_HEIGHT - CHART_PADDING_Y * 2;
  const maxValue = Math.max(...values, 1);

  return values
    .map((value, index) => {
      const x =
        CHART_PADDING_X +
        (index / Math.max(values.length - 1, 1)) * chartWidth;
      const y =
        CHART_PADDING_Y + chartHeight - (value / maxValue) * chartHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

type CaloriesTrendPanelProps = {
  buckets: NutritionProgressBucket[];
  days: 7 | 30;
};

export function CaloriesTrendPanel({
  buckets,
  days,
}: CaloriesTrendPanelProps) {
  const values = buckets.map((bucket) => bucket.totals.calories);
  const averageCalories =
    values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
  const bestCalories = Math.max(...values, 0);
  const todayCalories = values[values.length - 1] ?? 0;
  const path = createLinePath(values);

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
        <span>{days}-day calorie trend</span>
        <span>{roundValue(averageCalories)} avg kcal</span>
      </div>

      <div className="mt-2 rounded-xl border border-white/70 bg-white/85 px-3 py-3 shadow-sm">
        <svg
          className="h-[116px] w-full"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`${days}-day calorie trend`}
        >
          {[0.25, 0.5, 0.75].map((fraction) => {
            const y = CHART_PADDING_Y + (CHART_HEIGHT - CHART_PADDING_Y * 2) * fraction;
            return (
              <line
                key={fraction}
                x1={CHART_PADDING_X}
                x2={CHART_WIDTH - CHART_PADDING_X}
                y1={y}
                y2={y}
                stroke="#d7e9f7"
                strokeWidth="1"
                strokeDasharray="3 5"
              />
            );
          })}
          <path
            d={path}
            fill="none"
            stroke="#1fba8c"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {values.map((value, index) => {
            const x =
              CHART_PADDING_X +
              (index / Math.max(values.length - 1, 1)) *
                (CHART_WIDTH - CHART_PADDING_X * 2);
            const maxValue = Math.max(...values, 1);
            const y =
              CHART_PADDING_Y +
              (CHART_HEIGHT - CHART_PADDING_Y * 2) -
              (value / maxValue) * (CHART_HEIGHT - CHART_PADDING_Y * 2);

            return (
              <circle
                key={`${buckets[index]?.date ?? index}-point`}
                cx={x}
                cy={y}
                r="3.5"
                fill="#1fba8c"
                stroke="#ffffff"
                strokeWidth="2"
              />
            );
          })}
        </svg>

        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
          <span>{formatShortDate(buckets[0]?.date ?? "")}</span>
          <span>{formatShortDate(buckets[Math.floor((buckets.length - 1) / 2)]?.date ?? "")}</span>
          <span>{formatShortDate(buckets[buckets.length - 1]?.date ?? "")}</span>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {[
          {
            label: "Average",
            value: `${roundValue(averageCalories)} kcal`,
            accent: "text-[#1e7cb6]",
          },
          {
            label: "Peak Day",
            value: `${roundValue(bestCalories)} kcal`,
            accent: "text-emerald-600",
          },
          {
            label: "Selected Day",
            value: `${roundValue(todayCalories)} kcal`,
            accent: "text-amber-500",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-white/60 bg-white/80 px-3 py-2 shadow-sm"
          >
            <p className="text-xs text-slate-500">{item.label}</p>
            <p className={`mt-0.5 text-base font-semibold ${item.accent}`}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

type MacroTrendPanelProps = {
  buckets: NutritionProgressBucket[];
};

export function MacroTrendPanel({ buckets }: MacroTrendPanelProps) {
  const totals = buckets.map(
    (bucket) =>
      bucket.totals.protein * 4 +
      bucket.totals.carbs * 4 +
      bucket.totals.fat * 9,
  );
  const maxValue = Math.max(...totals, 1);
  const chartWidth = CHART_WIDTH - CHART_PADDING_X * 2;
  const barWidth = Math.max(4, chartWidth / Math.max(buckets.length * 1.7, 1));
  const gap = buckets.length > 1
    ? (chartWidth - barWidth * buckets.length) / (buckets.length - 1)
    : 0;
  const plotBottom = CHART_HEIGHT - CHART_PADDING_Y;
  const plotHeight = CHART_HEIGHT - CHART_PADDING_Y * 2;

  return (
    <div className="mt-3">
      <div className="flex items-center gap-4 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Protein
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#1e7cb6]" />
          Carbs
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          Fat
        </span>
      </div>

      <div className="mt-2 rounded-xl border border-white/70 bg-white/85 px-3 py-3 shadow-sm">
        <svg
          className="h-[120px] w-full"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT + 18}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Macronutrient trends"
        >
          {buckets.map((bucket, index) => {
            const totalCalories = totals[index];
            const proteinCalories = bucket.totals.protein * 4;
            const carbCalories = bucket.totals.carbs * 4;
            const fatCalories = bucket.totals.fat * 9;
            const totalHeight = (totalCalories / maxValue) * plotHeight;
            const proteinHeight =
              totalCalories === 0 ? 0 : (proteinCalories / totalCalories) * totalHeight;
            const carbHeight =
              totalCalories === 0 ? 0 : (carbCalories / totalCalories) * totalHeight;
            const fatHeight =
              totalCalories === 0 ? 0 : (fatCalories / totalCalories) * totalHeight;
            const x = CHART_PADDING_X + index * (barWidth + gap);
            const emptyHeight = totalCalories === 0 ? 3 : 0;
            const barBase = plotBottom;

            return (
              <g key={bucket.date}>
                {totalCalories === 0 ? (
                  <rect
                    x={x}
                    y={barBase - emptyHeight}
                    width={barWidth}
                    height={emptyHeight}
                    rx="2"
                    fill="#cfe2f2"
                  />
                ) : (
                  <>
                    <rect
                      x={x}
                      y={barBase - fatHeight}
                      width={barWidth}
                      height={fatHeight}
                      rx="2"
                      fill="#fbbf24"
                    />
                    <rect
                      x={x}
                      y={barBase - fatHeight - carbHeight}
                      width={barWidth}
                      height={carbHeight}
                      fill="#1e7cb6"
                    />
                    <rect
                      x={x}
                      y={barBase - fatHeight - carbHeight - proteinHeight}
                      width={barWidth}
                      height={proteinHeight}
                      rx="2"
                      fill="#10b981"
                    />
                  </>
                )}
              </g>
            );
          })}

          <text
            x={CHART_PADDING_X}
            y={CHART_HEIGHT + 10}
            fontSize="10"
            fill="#64748b"
          >
            {formatShortDate(buckets[0]?.date ?? "")}
          </text>
          <text
            x={CHART_WIDTH / 2}
            y={CHART_HEIGHT + 10}
            textAnchor="middle"
            fontSize="10"
            fill="#64748b"
          >
            {formatShortDate(buckets[Math.floor((buckets.length - 1) / 2)]?.date ?? "")}
          </text>
          <text
            x={CHART_WIDTH - CHART_PADDING_X}
            y={CHART_HEIGHT + 10}
            textAnchor="end"
            fontSize="10"
            fill="#64748b"
          >
            {formatShortDate(buckets[buckets.length - 1]?.date ?? "")}
          </text>
        </svg>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {[
          {
            label: "Avg Protein",
            value:
              buckets.reduce((sum, bucket) => sum + bucket.totals.protein, 0) /
              Math.max(buckets.length, 1),
            accent: "text-emerald-600",
            unit: "g",
          },
          {
            label: "Avg Carbs",
            value:
              buckets.reduce((sum, bucket) => sum + bucket.totals.carbs, 0) /
              Math.max(buckets.length, 1),
            accent: "text-[#1e7cb6]",
            unit: "g",
          },
          {
            label: "Avg Fat",
            value:
              buckets.reduce((sum, bucket) => sum + bucket.totals.fat, 0) /
              Math.max(buckets.length, 1),
            accent: "text-amber-500",
            unit: "g",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-white/60 bg-white/80 px-3 py-2 shadow-sm"
          >
            <p className="text-xs text-slate-500">{item.label}</p>
            <p className={`mt-0.5 text-base font-semibold ${item.accent}`}>
              {roundValue(item.value)} {item.unit}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
