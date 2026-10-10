import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const basePath = "/hachiware-techo";
const outputRoot = resolve(fileURLToPath(new URL("../out/", import.meta.url)));
const port = Number(process.argv[2] ?? 4173);
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  if (url.pathname === basePath) url.pathname = `${basePath}/`;
  if (url.pathname !== basePath && !url.pathname.startsWith(`${basePath}/`)) {
    response.writeHead(404).end("Not found");
    return;
  }
  let relative = decodeURIComponent(url.pathname.slice(basePath.length)).replace(/^\/+/, "");
  if (!relative || relative.endsWith("/")) relative += "index.html";
  const filePath = resolve(outputRoot, relative);
  if (filePath !== outputRoot && !filePath.startsWith(`${outputRoot}${sep}`)) {
    response.writeHead(404).end("Not found");
    return;
  }
  try {
    const body = await readFile(filePath);
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": types[extname(filePath)] ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    }).end(body);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Serving out/ at http://127.0.0.1:${port}${basePath}/`);
});
