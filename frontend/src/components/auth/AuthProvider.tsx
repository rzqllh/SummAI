"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface AuthUser {
  email: string;
  name: string;
  image?: string;
}

interface AuthContextType {
  user: AuthUser;
  isLoggedIn: boolean;
  loginWithGoogle: () => void;
  logout: () => void;
  setUserWorkspace: (email: string, name?: string) => void;
}

const DEFAULT_USER: AuthUser = {
  email: "default",
  name: "Personal Workspace",
};

const AuthContext = createContext<AuthContextType>({
  user: DEFAULT_USER,
  isLoggedIn: false,
  loginWithGoogle: () => {},
  logout: () => {},
  setUserWorkspace: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>(DEFAULT_USER);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      const savedEmail = localStorage.getItem("SUMMAI_USER_EMAIL");
      const savedName = localStorage.getItem("SUMMAI_USER_NAME");
      const savedImage = localStorage.getItem("SUMMAI_USER_IMAGE");

      if (savedEmail && savedEmail.trim()) {
        setUser({
          email: savedEmail.trim().toLowerCase(),
          name: savedName || (savedEmail === "default" ? "Personal Workspace" : savedEmail.split("@")[0]),
          image: savedImage || undefined,
        });
      }
    }
  }, []);

  const handleSetUserWorkspace = (email: string, name?: string) => {
    const cleanEmail = (email || "default").trim().toLowerCase();
    const cleanName = name || (cleanEmail === "default" ? "Personal Workspace" : cleanEmail.split("@")[0]);
    const updated: AuthUser = {
      email: cleanEmail,
      name: cleanName,
    };
    setUser(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("SUMMAI_USER_EMAIL", cleanEmail);
      localStorage.setItem("SUMMAI_USER_NAME", cleanName);
      localStorage.removeItem("SUMMAI_USER_IMAGE");
      // Trigger a storage event for all active components to refresh
      window.dispatchEvent(new Event("storage"));
    }
  };

  const handleLoginGoogle = () => {
    // Interactive Google account simulation & custom workspace prompt
    const input = window.prompt(
      "Enter your Google Email or Corporate Account to access your isolated workspace:\n(Each account has 100% isolated private transcripts & presets)",
      user.email !== "default" ? user.email : "user@gmail.com"
    );
    if (input && input.trim()) {
      const email = input.trim().toLowerCase();
      const name = email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      handleSetUserWorkspace(email, name);
    }
  };

  const handleLogout = () => {
    setUser(DEFAULT_USER);
    if (typeof window !== "undefined") {
      localStorage.removeItem("SUMMAI_USER_EMAIL");
      localStorage.removeItem("SUMMAI_USER_NAME");
      localStorage.removeItem("SUMMAI_USER_IMAGE");
      window.dispatchEvent(new Event("storage"));
    }
  };

  const isLoggedIn = isClient && user.email !== "default";

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn,
        loginWithGoogle: handleLoginGoogle,
        logout: handleLogout,
        setUserWorkspace: handleSetUserWorkspace,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
