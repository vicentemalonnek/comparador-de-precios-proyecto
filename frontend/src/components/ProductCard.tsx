import { useTranslation } from "react-i18next";
import type { Comparison } from "../services/api";
import { useFormatters } from "../hooks/useFormatters";
import { parseDbDate } from "../utils/date";
import PriceHistory from "./PriceHistory";
import type { NearestByStore } from "../utils/distance";

export default function ProductCard({
  product,
  nearest,
}: {
  product: Comparison;
  nearest: NearestByStore;
}) {
  const { t } = useTranslation();
  const { money, km, date } = useFormatters();

  const { offers } = product;
  const cheapest = offers[0].price;
  const difference = offers[offers.length - 1].price - cheapest;
  // Only highlight a winner when the stores really differ in price
  const hasWinner = offers.length > 1 && difference > 0;

  return (
    <li className="pc-card">
      <span className="pc-card__category">{t(`categories.${product.category}`)}</span>
      <h3 className="pc-card__name">{product.name}</h3>

      {hasWinner && (
        <p className="pc-card__saving">
          {t("products.difference", { amount: money.format(difference) })}
        </p>
      )}

      <ul className="pc-offers">
        {offers.map((offer) => {
          const isBest = hasWinner && offer.price === cheapest;
          const stockLabel = offer.inStock === null
            ? t("products.stock.unknown")
            : offer.inStock
            ? t("products.stock.in")
            : t("products.stock.out");

          return (
            <li
              key={offer.productId}
              className={isBest ? "pc-offer pc-offer--best" : "pc-offer"}
            >
              <div className="pc-offer__head">
                <span className="pc-offer__store">{offer.store}</span>
                {isBest && <span className="pc-badge">{t("products.cheapest")}</span>}
              </div>
              <p className="pc-offer__price">{money.format(offer.price)}</p>
              {offer.cashPrice !== null && (
                <p className="pc-card__meta">
                  {t("products.cashPrice")}: {money.format(offer.cashPrice)}
                </p>
              )}
              <p className="pc-card__meta">{stockLabel}</p>
                {nearest[offer.store] && (
                  <p className="pc-card__meta">
                    {t("geo.nearestBranch", {
                      name: nearest[offer.store].name,
                      km: km.format(nearest[offer.store].km),
              })}
              </p>
            )}
              <p className="pc-card__meta">
                {t("products.updated", {
                  date: date.format(parseDbDate(offer.scrapedAt)),
                })}
              </p>
              <a
                className="pc-card__link"
                href={offer.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("products.viewInStore", { store: offer.store })}
              </a>
              <PriceHistory productId={offer.productId} />
            </li>
          );
        })}
      </ul>
    </li>
  );
}