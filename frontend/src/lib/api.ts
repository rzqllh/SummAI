import axios from "axios";

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const custom = localStorage.getItem("SUMMAI_BACKEND_URL");
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, "");
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
}

export function getCurrentUserEmail(): string {
  if (typeof window !== "undefined") {
    const email = localStorage.getItem("SUMMAI_USER_EMAIL");
    if (email && email.trim()) {
      return email.trim().toLowerCase();
    }
  }
  return "default";
}

export function getApiHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    "x-user-email": getCurrentUserEmail(),
    ...extraHeaders,
  };

  if (typeof window !== "undefined") {
    const savedGeminiKey = localStorage.getItem("SUMMAI_GEMINI_KEY");
    const savedGroqKey = localStorage.getItem("SUMMAI_GROQ_KEY");
    const savedCfToken = localStorage.getItem("SUMMAI_CF_TOKEN");

    if (savedGeminiKey) headers["x-gemini-api-key"] = savedGeminiKey;
    if (savedGroqKey) headers["x-groq-api-key"] = savedGroqKey;
    if (savedCfToken) headers["x-cf-api-token"] = savedCfToken;
  }

  return headers;
}

// Global Axios request interceptor to automatically attach current user session header
if (typeof window !== "undefined") {
  axios.interceptors.request.use((config) => {
    const email = getCurrentUserEmail();
    config.headers = config.headers || {};
    config.headers["x-user-email"] = email;

    const savedGeminiKey = localStorage.getItem("SUMMAI_GEMINI_KEY");
    const savedGroqKey = localStorage.getItem("SUMMAI_GROQ_KEY");
    const savedCfToken = localStorage.getItem("SUMMAI_CF_TOKEN");

    if (savedGeminiKey && !config.headers["x-gemini-api-key"]) {
      config.headers["x-gemini-api-key"] = savedGeminiKey;
    }
    if (savedGroqKey && !config.headers["x-groq-api-key"]) {
      config.headers["x-groq-api-key"] = savedGroqKey;
    }
    if (savedCfToken && !config.headers["x-cf-api-token"]) {
      config.headers["x-cf-api-token"] = savedCfToken;
    }

    return config;
  });
}
