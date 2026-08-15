import { Platform } from "react-native";

export const SESSION_TOKEN_KEY = "app_session_token";
export const USER_INFO_KEY = "aura-user-info";

export function getApiBaseUrl(): string {
  // Try to get from env first
  const API_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (API_URL) {
    return API_URL.replace(/\/$/, "");
  }

  // On web, derive from current hostname if running in dev environment
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    const { protocol, hostname } = window.location;
    // Pattern: 8081-sandboxid.region.domain -> 3000-sandboxid.region.domain
    const apiHostname = hostname.replace(/^8081-/, "3000-");
    if (apiHostname !== hostname) {
      return `${protocol}//${apiHostname}`;
    }
    // Fallback for local dev
    if (hostname === "localhost") {
      return `${protocol}//localhost:3000`;
    }
  }

  return "";
}
