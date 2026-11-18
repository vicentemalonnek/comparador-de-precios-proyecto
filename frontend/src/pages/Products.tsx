import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import NearbyStores from "../components/NearbyStores";
import ProductCard from "../components/ProductCard";
import { useGeolocation } from "../hooks/useGeolocation";
import {
  type Branch,
  type CategoryFilter,
  type Comparison,
  fetchBranches,
  fetchComparisons,
} from "../services/api";
import { type NearestByStore, nearestByStore } from "../utils/distance";
import "../styles/products.css";

const CATEGORIES: CategoryFilter[] = ["all", "cpu", "ram", "ssd"];

type Status = "loading" | "error" | "ready";

export default function Products() {
  const { t } = useTranslation();
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [onlyCompared, setOnlyCompared] = useState(false);
  const [products, setProducts] = useState<Comparison[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [branches, setBranches] = useState<Branch[]>([]);
  const { position, status: geoStatus, request: requestLocation } =
    useGeolocation();

  useEffect(() => {
    const controller = new AbortController();

    fetchComparisons(category, controller.signal)
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

  useEffect(() => {
    const controller = new AbortController();

    fetchBranches(controller.signal)
      .then(setBranches)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setBranches([]); // the page still works without branches
      });

    return () => controller.abort();
  }, []);

  const nearest = useMemo<NearestByStore>(
    () => (position ? nearestByStore(branches, position) : {}),
    [branches, position],
  );

  const selectCategory = (next: CategoryFilter) => {
    if (next === category) return;
    setStatus("loading");
    setCategory(next);
  };

  const visible = onlyCompared
    ? products.filter((p) => p.offers.length > 1)
    : products;

  return (
    <section>
      <NearbyStores
        branches={branches}
        position={position}
        status={geoStatus}
        onRequest={requestLocation}
      />

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

      <label className="pc-toggle">
        <input
          type="checkbox"
          checked={onlyCompared}
          onChange={(event) => setOnlyCompared(event.target.checked)}
        />
        {t("products.onlyCompared")}
      </label>

      {status === "loading" && <p role="status">{t("products.loading")}</p>}
      {status === "error" && <p role="alert">{t("products.error")}</p>}

      {status === "ready" && (
        <>
          <p className="pc-count">{t("products.count", { count: visible.length })}</p>

          {visible.length === 0 ? (
            <p>{t("products.empty")}</p>
          ) : (
            <ul className="pc-grid">
              {visible.map((product) => (
                <ProductCard key={product.key} product={product} nearest={nearest} />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}