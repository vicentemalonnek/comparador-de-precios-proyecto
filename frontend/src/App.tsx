import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./components/LanguageSwitcher";
import Products from "./pages/Products";

function App() {
  const { t } = useTranslation();

  return (
    <main className="pc-app">
      <header className="pc-header">
        <h1>{t("app.title")}</h1>
        <LanguageSwitcher />
      </header>
      <p>{t("app.subtitle")}</p>
      <Products />
    </main>
  );
}

export default App;