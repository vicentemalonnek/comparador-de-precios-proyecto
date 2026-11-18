import { useTranslation } from "react-i18next";
import { useFormatters } from "../hooks/useFormatters";
import type { GeoStatus } from "../hooks/useGeolocation";
import type { Branch } from "../services/api";
import { type Coordinates, distanceKm } from "../utils/distance";

const MAX_RESULTS = 5;

interface Props {
  branches: Branch[];
  position: Coordinates | null;
  status: GeoStatus;
  onRequest: () => void;
}

function directionsUrl(branch: Branch): string {
  // Plain Google Maps link: it needs no API key
  return `https://www.google.com/maps/dir/?api=1&destination=${branch.latitude},${branch.longitude}`;
}

export default function NearbyStores(
  { branches, position, status, onRequest }: Props,
) {
  const { t } = useTranslation();
  const { km: kmFormat } = useFormatters();

  // Without branch data in the backend there is nothing to show
  if (branches.length === 0) return null;

  const nearby = position
    ? branches
      .map((branch) => ({ branch, km: distanceKm(position, branch) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, MAX_RESULTS)
    : [];

  return (
    <section className="pc-nearby" aria-labelledby="nearby-title">
      <h2 id="nearby-title" className="pc-nearby__title">{t("geo.title")}</h2>
      <p className="pc-card__meta">{t("geo.privacy")}</p>

      <button
        type="button"
        className="pc-button"
        onClick={onRequest}
        disabled={status === "loading"}
      >
        {status === "loading"
          ? t("geo.locating")
          : position
          ? t("geo.refresh")
          : t("geo.use")}
      </button>

      {status === "denied" && <p role="alert">{t("geo.denied")}</p>}
      {status === "unavailable" && <p role="alert">{t("geo.unavailable")}</p>}

      {nearby.length > 0 && (
        <ol className="pc-nearby__list">
          {nearby.map(({ branch, km }) => (
            <li key={branch.id} className="pc-nearby__item">
              <div>
                <strong>{branch.store}</strong> · {branch.name}
                <p className="pc-card__meta">{branch.address}</p>
                {branch.openingHours && (
                  <p className="pc-card__meta">
                    {t("geo.hours", { hours: branch.openingHours })}
                  </p>
                )}
              </div>
              <div className="pc-nearby__side">
                <span className="pc-nearby__distance">
                  {t("geo.distance", { km: kmFormat.format(km) })}
                </span>
                <a
                  href={directionsUrl(branch)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("geo.directions")}
                </a>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}