import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, AUTH_UNAUTHORIZED_EVENT } from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleUnauthorized = () => setUser(null);
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);

    api("/auth/me")
      .then((result) => setUser(result.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      async login(credentials) {
        const result = await api("/auth/login", {
          method: "POST",
          body: JSON.stringify(credentials)
        });
        setUser(result.user);
        return result.user;
      },
      async logout() {
        await api("/auth/logout", { method: "POST" });
        setUser(null);
      },
      async refreshUser() {
        const result = await api("/auth/me");
        setUser(result.user);
        return result.user;
      },
      async changePassword(credentials) {
        const result = await api("/auth/change-password", {
          method: "POST",
          body: JSON.stringify(credentials)
        });
        setUser(result.user);
        return result.user;
      }
    }),
    [loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// The hook intentionally shares this module with its provider.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
