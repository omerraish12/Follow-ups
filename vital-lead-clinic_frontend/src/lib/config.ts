const envApi = import.meta.env.VITE_API_URL as string | undefined;

// If we're on HTTPS and the env points to http://localhost, avoid mixed-content blocks.
const shouldIgnoreEnvApi =
  typeof window !== "undefined" &&
  window.location.protocol === "https:" &&
  envApi?.startsWith("http://localhost");

const resolvedApi =
  !envApi || shouldIgnoreEnvApi
    ? `${typeof window !== "undefined" ? window.location.origin : "http://localhost:4000"}/api`
    : envApi;

export const appConfig = {
  apiUrl: resolvedApi.replace(/\/$/, ""),
};

export type AppConfig = typeof appConfig;
