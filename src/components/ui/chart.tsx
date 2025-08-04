import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "@/lib/utils";

const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};

type ChartProps = {
  data?: any[];
  type?: "bar" | "line" | "area" | "pie";
  keys?: string[];
  config: ChartConfig;
  xKey: string;
  yLabel?: string;
  height?: number;
  width?: number;
  // ...outros props se necessário
  className?: string;
};

const Chart: React.FC<ChartProps> = ({
  data = [],
  type = "bar",
  keys = [],
  config,
  xKey,
  yLabel,
  height = 300,
  width = undefined,
  className,
}) => {
  // Proteção: só renderiza gráfico se dados essenciais existirem
  const isValid =
    Array.isArray(data) &&
    typeof type === "string" &&
    Array.isArray(keys) &&
    keys.length > 0;

  if (!isValid) {
    return (
      <div className="text-center text-gray-400 py-8">
        Sem dados para exibir
      </div>
    );
  }

  // Gera cores para cada key
  const getColor = (key: string) =>
    config[key]?.color ||
    `var(--color-${key}, hsl(${Math.floor(Math.random() * 360)}, 70%, 60%))`;

  // Renderização automática do gráfico
  let ChartElement = null;
  switch (type) {
    case "bar":
      ChartElement = (
        <RechartsPrimitive.BarChart data={data}>
          <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" />
          <RechartsPrimitive.XAxis dataKey={xKey} />
          <RechartsPrimitive.YAxis
            label={
              yLabel
                ? { value: yLabel, angle: -90, position: "insideLeft" }
                : undefined
            }
          />
          <RechartsPrimitive.Tooltip />
          <RechartsPrimitive.Legend />
          {keys.map((key) => (
            <RechartsPrimitive.Bar
              key={key}
              dataKey={key}
              fill={getColor(key)}
              name={config[key]?.label || key}
              radius={[4, 4, 0, 0]}
              maxBarSize={48}
            />
          ))}
        </RechartsPrimitive.BarChart>
      );
      break;
    case "line":
      ChartElement = (
        <RechartsPrimitive.LineChart data={data}>
          <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" />
          <RechartsPrimitive.XAxis dataKey={xKey} />
          <RechartsPrimitive.YAxis
            label={
              yLabel
                ? { value: yLabel, angle: -90, position: "insideLeft" }
                : undefined
            }
          />
          <RechartsPrimitive.Tooltip />
          <RechartsPrimitive.Legend />
          {keys.map((key) => (
            <RechartsPrimitive.Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={getColor(key)}
              name={config[key]?.label || key}
              strokeWidth={2}
              dot
            />
          ))}
        </RechartsPrimitive.LineChart>
      );
      break;
    case "area":
      ChartElement = (
        <RechartsPrimitive.AreaChart data={data}>
          <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" />
          <RechartsPrimitive.XAxis dataKey={xKey} />
          <RechartsPrimitive.YAxis
            label={
              yLabel
                ? { value: yLabel, angle: -90, position: "insideLeft" }
                : undefined
            }
          />
          <RechartsPrimitive.Tooltip />
          <RechartsPrimitive.Legend />
          {keys.map((key) => (
            <RechartsPrimitive.Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={getColor(key)}
              fill={getColor(key)}
              name={config[key]?.label || key}
            />
          ))}
        </RechartsPrimitive.AreaChart>
      );
      break;
    case "pie":
      ChartElement = (
        <RechartsPrimitive.PieChart>
          <RechartsPrimitive.Tooltip />
          <RechartsPrimitive.Legend />
          <RechartsPrimitive.Pie
            data={data}
            dataKey={keys[0]}
            nameKey={xKey}
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill={getColor(keys[0])}
            label
          >
            {data.map((entry, idx) => (
              <RechartsPrimitive.Cell
                key={`cell-${idx}`}
                fill={getColor(keys[0])}
              />
            ))}
          </RechartsPrimitive.Pie>
        </RechartsPrimitive.PieChart>
      );
      break;
    default:
      ChartElement = <div>Tipo de gráfico não suportado</div>;
  }

  return (
    <div
      className={cn(
        "flex aspect-video justify-center text-xs",
        className,
      )}
      style={{ width: width || "100%", minWidth: 320, height }}
    >
      <ChartStyle id="chart" config={config} />
      <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
        {ChartElement}
      </RechartsPrimitive.ResponsiveContainer>
    </div>
  );
};

// Mantém o ChartStyle do seu código original
const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const safeConfig = config ?? {};
  const colorConfig = Object.entries(safeConfig).filter(
    ([_, config]) => config.theme || config.color,
  );
  if (!colorConfig.length) {
    return null;
  }
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
      itemConfig.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .join("\n")}
}
`,
          )
          .join("\n"),
      }}
    />
  );
};

export { Chart };