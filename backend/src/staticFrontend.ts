import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Express } from "express";
import express from "express";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

/** Absolute path to `frontend/dist` from compiled backend output (`backend/dist`). */
export function resolveFrontendDist(): string {
  return path.resolve(moduleDir, "../../frontend/dist");
}

export function frontendDistExists(): boolean {
  const indexPath = path.join(resolveFrontendDist(), "index.html");
  return fs.existsSync(indexPath);
}

/** Serve Vite build output + SPA fallback (non-`/api` GET → index.html). */
export function mountFrontendStatic(app: Express): void {
  const dist = resolveFrontendDist();

  if (!frontendDistExists()) {
    console.warn(
      `[mealmap] frontend dist not found at ${dist} — skipping static file serving`,
    );
    return;
  }

  app.use(express.static(dist, { index: false }));

  app.get("*", (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }
    if (req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(path.join(dist, "index.html"), (err) => {
      if (err) next(err);
    });
  });
}
