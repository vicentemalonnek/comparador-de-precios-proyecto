import { useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchPriceHistory, type PricePoint } from "../services/api";
import PriceChart from "./PriceChart";

type Status = "idle" | "loading" | "error" | "ready";

export default function PriceHistory({ productId }: { productId: number }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [points, setPoints] = useState<PricePoint[]>([]);

  const toggle = () => {
    const willOpen = !open;
    setOpen(willOpen);

    // Fetch only the first time it is opened (or after an error)
    if (willOpen && (status === "idle" || status === "error")) {
      setStatus("loading");
      fetchPriceHistory(productId)
        .then((data) => {
          setPoints(data);
          setStatus("ready");
        })
        .catch(() => setStatus("error"));
    }
  };

  return (
    <div className="pc-history">
      <button
        type="button"
        className="pc-link-button"
        aria-expanded={open}
        onClick={toggle}
      >
        {open ? t("history.hide") : t("history.show")}
      </button>
      {open && status === "loading" && <p role="status">{t("history.loading")}</p>}
      {open && status === "error" && <p role="alert">{t("history.error")}</p>}
      {open && status === "ready" && <PriceChart points={points} />}
    </div>
  );
}