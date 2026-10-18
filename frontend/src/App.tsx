import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./components/LanguageSwitcher";

const API_URL = "http://localhost:8000";

type BackendStatus = "loading" | "ok" | "unreachable";

function App() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<BackendStatus>("loading");

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => res.json())
      .then((data) => setStatus(data.status === "ok" ? "ok" : "unreachable"))
      .catch(() => setStatus("unreachable"));
  }, []);

  return (
    <main>
      <LanguageSwitcher />
      <h1>{t("app.title")}</h1>
      <p>{t("app.backendStatus", { status: t(`status.${status}`) })}</p>
    </main>
  );
}

export default App;