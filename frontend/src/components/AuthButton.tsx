import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchCurrentUser,
  getLoginUrl,
  logout,
  type AuthUser,
} from "../services/auth";

type AuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; user: AuthUser };

export default function AuthButton() {
  const { t } = useTranslation();
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    fetchCurrentUser(controller.signal)
      .then((user) =>
        setState(user ? { status: "authenticated", user } : { status: "anonymous" })
      )
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ status: "anonymous" });
      });

    return () => controller.abort();
  }, []);

  const handleLogout = async () => {
    await logout().catch(() => undefined);
    setState({ status: "anonymous" });
  };

  if (state.status === "loading") return null;

  if (state.status === "anonymous") {
    return (
      <a className="pc-button" href={getLoginUrl()}>
        {t("auth.login")}
      </a>
    );
  }

  const { user } = state;
  return (
    <div className="pc-user">
      {user.picture && (
        <img
          className="pc-user__avatar"
          src={user.picture}
          alt=""
          width={32}
          height={32}
          referrerPolicy="no-referrer"
        />
      )}
      <span className="pc-user__name">{user.name ?? user.email}</span>
      <button type="button" className="pc-button" onClick={handleLogout}>
        {t("auth.logout")}
      </button>
    </div>
  );
}