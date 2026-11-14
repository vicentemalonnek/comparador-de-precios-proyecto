import { useTranslation } from "react-i18next";
import AuthButton from "./components/AuthButton";
import LanguageSwitcher from "./components/LanguageSwitcher";
import Products from "./pages/Products";

function App() {
  const { t } = useTranslation();
  // The backend redirects here with ?login=error when the Google login fails
  const loginFailed =
    new URLSearchParams(window.location.search).get("login") === "error";

  return (
    <main className="pc-app">
      <header className="pc-header">
        <h1>{t("app.title")}</h1>
        <div className="pc-header__actions">
          <LanguageSwitcher />
          <AuthButton />
        </div>
      </header>
      {loginFailed && <p role="alert">{t("auth.loginError")}</p>}
      <p>{t("app.subtitle")}</p>
      <Products />
    </main>
  );
}

export default App;