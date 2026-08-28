export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const custom = localStorage.getItem("SUMMAI_BACKEND_URL");
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, "");
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
}
