import { useMemo } from "react";
import { useTranslation } from "react-i18next";

// Money, distance and date formatters that follow the selected language
export function useFormatters() {
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CL";

  return useMemo(
    () => ({
      money: new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
      }),
      km: new Intl.NumberFormat(locale, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
      date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }),
    }),
    [locale],
  );
}