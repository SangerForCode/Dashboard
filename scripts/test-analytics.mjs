import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const dir = await mkdtemp(join(tmpdir(), "folio-test-"));
try {
  const out = join(dir, "test.mjs");
  await build({
    entryPoints: ["tests/analytics.test.ts"],
    outfile: out,
    bundle: true,
    platform: "node",
    format: "esm",
  });
  await import(pathToFileURL(out).href);
} finally {
  await rm(dir, { recursive: true, force: true });
}
