"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthModal } from "./AuthModal";

interface AuthUser {
  email: string;
  name: string;
  image?: string;
}

interface AuthContextType {
  user: AuthUser;
  isLoggedIn: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
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
  openAuthModal: () => {},
  closeAuthModal: () => {},
  logout: () => {},
  setUserWorkspace: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>(DEFAULT_USER);
  const [isClient, setIsClient] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      window.dispatchEvent(new Event("storage"));
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
        openAuthModal: () => setIsModalOpen(true),
        closeAuthModal: () => setIsModalOpen(false),
        logout: handleLogout,
        setUserWorkspace: handleSetUserWorkspace,
      }}
    >
      {children}
      <AuthModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentEmail={user.email}
        onSelectWorkspace={handleSetUserWorkspace}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
