import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchProducts, type CategoryFilter, type Product } from "../services/api";
import "../styles/products.css";

const CATEGORIES: CategoryFilter[] = ["all", "cpu", "ram", "ssd"];

type Status = "loading" | "error" | "ready";

// SQLite CURRENT_TIMESTAMP is UTC and looks like "2026-11-08 14:03:21"
function parseDbDate(value: string): Date {
  return new Date(value.replace(" ", "T") + "Z");
}

export default function Products() {
  const { t, i18n } = useTranslation();
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const controller = new AbortController();

    fetchProducts(category, controller.signal)
      .then((data) => {
        setProducts(data);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        // A cancelled request (the user changed category) is not an error
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("error");
      });

    return () => controller.abort();
  }, [category]);

  const selectCategory = (next: CategoryFilter) => {
    if (next === category) return;
    setStatus("loading");
    setCategory(next);
  };

  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CL";
  const money = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  });
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <section>
      <div className="pc-filters" role="group" aria-label={t("products.filterLabel")}>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            className={c === category ? "pc-chip pc-chip--active" : "pc-chip"}
            aria-pressed={c === category}
            onClick={() => selectCategory(c)}
          >
            {t(`categories.${c}`)}
          </button>
        ))}
      </div>

      {status === "loading" && <p role="status">{t("products.loading")}</p>}
      {status === "error" && <p role="alert">{t("products.error")}</p>}

      {status === "ready" && (
        <>
          <p className="pc-count">{t("products.count", { count: products.length })}</p>

          {products.length === 0 ? (
            <p>{t("products.empty")}</p>
          ) : (
            <ul className="pc-grid">
              {products.map((p) => (
                <li key={`${p.id}-${p.store}`} className="pc-card">
                  <span className="pc-card__category">{t(`categories.${p.category}`)}</span>
                  <h3 className="pc-card__name">{p.name}</h3>
                  <p className="pc-card__price">{money.format(p.price)}</p>
                  <p className="pc-card__meta">{t("products.normalPrice")}</p>
                  {p.cashPrice !== null && (
                    <p className="pc-card__meta">
                      {t("products.cashPrice")}: {money.format(p.cashPrice)}
                    </p>
                  )}
                  <p className="pc-card__meta">
                    {t("products.updated", { date: dateFormat.format(parseDbDate(p.scrapedAt)) })}
                  </p>
                  <a className="pc-card__link" href={p.url} target="_blank" rel="noopener noreferrer">
                    {t("products.viewInStore", { store: p.store })}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}