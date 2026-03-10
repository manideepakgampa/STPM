import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { loadPersistedState, savePersistedState } from "./src/lib/persisted-state.server";

const stateApiPlugin = () => ({
  name: "state-file-api",
  configureServer(server: { middlewares: { use: (handler: (req: any, res: any, next: () => void) => void) => void } }) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith("/api/state")) {
        next();
        return;
      }

      try {
        if (req.method === "GET" && req.url === "/api/state") {
          const state = await loadPersistedState();
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(state));
          return;
        }

        if (req.method === "PUT" && req.url === "/api/state") {
          const chunks: Buffer[] = [];
          req.on("data", (chunk: Buffer) => chunks.push(chunk));
          req.on("end", async () => {
            const body = Buffer.concat(chunks).toString("utf-8");
            const nextState = JSON.parse(body) as Record<string, unknown>;
            await savePersistedState(nextState);
            res.statusCode = 204;
            res.end();
          });
          return;
        }
      } catch (error) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }));
        return;
      }

      next();
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), stateApiPlugin(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
