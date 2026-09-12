import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const repoDataRoot = path.resolve(__dirname, "..", "data");

function serveRepoData(): Plugin {
  return {
    name: "serve-repo-data",
    configureServer(server) {
      server.middlewares.use("/repo-data", (req, res, next) => {
        const rel = (req.url ?? "").replace(/^\//, "").split("?")[0];
        if (!rel || rel.includes("..")) {
          next();
          return;
        }
        const filePath = path.join(repoDataRoot, rel);
        if (!filePath.startsWith(repoDataRoot) || !fs.existsSync(filePath)) {
          next();
          return;
        }
        if (filePath.endsWith(".json")) {
          res.setHeader("Content-Type", "application/json");
        } else if (filePath.endsWith(".csv")) {
          res.setHeader("Content-Type", "text/csv; charset=utf-8");
        }
        fs.createReadStream(filePath).pipe(res);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use("/repo-data", (req, res, next) => {
        const rel = (req.url ?? "").replace(/^\//, "").split("?")[0];
        if (!rel || rel.includes("..")) {
          next();
          return;
        }
        const filePath = path.join(repoDataRoot, rel);
        if (!filePath.startsWith(repoDataRoot) || !fs.existsSync(filePath)) {
          next();
          return;
        }
        if (filePath.endsWith(".json")) {
          res.setHeader("Content-Type", "application/json");
        } else if (filePath.endsWith(".csv")) {
          res.setHeader("Content-Type", "text/csv; charset=utf-8");
        }
        fs.createReadStream(filePath).pipe(res);
      });
    },
  };
}

export default defineConfig({
  base: "/fx-margin-scraper/",
  plugins: [react(), serveRepoData()],
  server: {
    port: 5173,
  },
});
