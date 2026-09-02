import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    sourcemap: true,
  },
  {
    entry: {
      "bin/npm-cli": "bin/npm-cli.ts",
    },
    format: ["esm"],
    banner: {
      js: "#!/usr/bin/env node",
    },
    clean: false,
    sourcemap: true,
  },
]);
