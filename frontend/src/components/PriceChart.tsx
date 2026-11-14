import { useTranslation } from "react-i18next";
import type { PricePoint } from "../services/api";
import { parseDbDate } from "../utils/date";

const WIDTH = 300;
const HEIGHT = 120;
const PAD_X = 12;
const PAD_Y = 16;

export default function PriceChart({ points }: { points: PricePoint[] }) {
  const { t, i18n } = useTranslation();

  if (points.length < 2) {
    return <p>{t("history.notEnough")}</p>;
  }

  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CL";
  const money = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  });
  const dateFormat = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  });

  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  // Map a point index and a price to coordinates inside the SVG
  const x = (index: number) =>
    PAD_X + (index / (points.length - 1)) * (WIDTH - 2 * PAD_X);
  const y = (price: number) =>
    max === min
      ? HEIGHT / 2 // flat line when the price never changed
      : HEIGHT - PAD_Y - ((price - min) / (max - min)) * (HEIGHT - 2 * PAD_Y);

  const line = points.map((p, i) => `${x(i)},${y(p.price)}`).join(" ");
  const firstDate = parseDbDate(points[0].scrapedAt);
  const lastDate = parseDbDate(points[points.length - 1].scrapedAt);

  return (
    <figure className="pc-chart">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={t("history.chartLabel", {
          min: money.format(min),
          max: money.format(max),
        })}
      >
        <polyline points={line} fill="none" stroke="currentColor" strokeWidth="2" />
        {points.map((p, i) => (
          <circle
            key={`${p.scrapedAt}-${i}`}
            cx={x(i)}
            cy={y(p.price)}
            r="3"
            fill="currentColor"
          />
        ))}
      </svg>
      <figcaption className="pc-chart__caption">
        <span>{dateFormat.format(firstDate)}</span>
        <span>
          {money.format(min)}
          {max !== min && ` – ${money.format(max)}`}
        </span>
        <span>{dateFormat.format(lastDate)}</span>
      </figcaption>
    </figure>
  );
}