import { useTranslation } from "react-i18next";

const languages = ["es", "en"] as const;

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("language", lng);
  };

  return (
    <div role="group" aria-label={t("language.label")}>
      {languages.map((lng) => (
        <button
          key={lng}
          onClick={() => changeLanguage(lng)}
          disabled={i18n.resolvedLanguage === lng}
        >
          {t(`language.${lng}`)}
        </button>
      ))}
    </div>
  );
}