export function getApiUrl() {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;

    // Prefer env override if provided (even on localhost). This lets you run
    // frontend locally while pointing at a remote API.
    const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
    if (envUrl) {
      return envUrl;
    }

    // Always use localhost for local development
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.0.")
    ) {
      return "http://localhost:3001";
    }

    // Production detection
    if (hostname === "app.artistinfluence.com" || hostname.includes("artistinfluence.com")) {
      return "https://api.artistinfluence.com";
    }

    // Default to localhost for development
    return "http://localhost:3001";
  }

  // Server-side: check env vars, default to localhost
  const envUrl = process.env.API_URL || process.env.API_BASE_URL;
  return envUrl || "http://localhost:3001";
}


