import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const DEV_HOST = process.env.VITE_DEV_SERVER_HOST || "0.0.0.0";
const DEV_PORT = Number(process.env.VITE_DEV_SERVER_PORT ?? 8080);
const HMR_PROTOCOL = process.env.VITE_HMR_PROTOCOL || "ws";
// If VITE_HMR_HOST is unset, let Vite use the page's origin instead of forcing localhost
const HMR_HOST = (process.env.VITE_HMR_HOST || "").trim() || undefined;
const HMR_PORT = Number(process.env.VITE_HMR_PORT ?? DEV_PORT);
const HMR_CLIENT_PORT = Number(process.env.VITE_HMR_CLIENT_PORT ?? HMR_PORT);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: DEV_HOST,
    port: DEV_PORT,
    strictPort: true,
    hmr: {
      protocol: HMR_PROTOCOL,
      ...(HMR_HOST ? { host: HMR_HOST } : {}),
      port: HMR_PORT,
      clientPort: HMR_CLIENT_PORT,
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
