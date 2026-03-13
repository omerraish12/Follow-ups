import { z } from "zod";

const envSchema = z.object({
  VITE_API_URL: z.string().url(),
});

const parsed = envSchema.parse(import.meta.env);

export const appConfig = {
  apiUrl: parsed.VITE_API_URL.replace(/\/$/, ""),
};

export type AppConfig = typeof appConfig;
