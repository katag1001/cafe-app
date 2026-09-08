// maplibre-gl's worker script (maplibre-gl-worker.mjs) has its own relative
// import of maplibre-gl-shared.mjs. Vite's `?url` asset import only copies
// the single file it's pointed at and never follows that internal import,
// so the two files must be copied together, unhashed, into public/ so they
// keep sitting next to each other at a stable path in both dev and the
// production build. Runs before dev/build so it stays in sync with whatever
// maplibre-gl version is installed.
import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const sourceDir = path.join(rootDir, "node_modules", "maplibre-gl", "dist");
const targetDir = path.join(rootDir, "public", "maplibre-worker");

const files = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

mkdirSync(targetDir, { recursive: true });

for (const file of files) {
  const source = path.join(sourceDir, file);
  if (!existsSync(source)) {
    throw new Error(`Expected maplibre-gl to ship ${file} at ${source}`);
  }
  copyFileSync(source, path.join(targetDir, file));
}
