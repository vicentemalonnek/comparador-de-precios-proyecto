import { useCallback, useState } from "react";
import type { Coordinates } from "../utils/distance";

export type GeoStatus = "idle" | "loading" | "ready" | "denied" | "unavailable";

export function useGeolocation() {
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [status, setStatus] = useState<GeoStatus>("idle");

  const request = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      return;
    }

    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (result) => {
        setPosition({
          latitude: result.coords.latitude,
          longitude: result.coords.longitude,
        });
        setStatus("ready");
      },
      (error) =>
        setStatus(
          error.code === error.PERMISSION_DENIED ? "denied" : "unavailable",
        ),
      { timeout: 10_000, maximumAge: 5 * 60 * 1000 },
    );
  }, []);

  return { position, status, request };
}