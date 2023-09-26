import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import nodeResolve from "@rollup/plugin-node-resolve";

/** @type {import("rollup").RollupOptions} */
export default {
  input: "dist/bin/cli.js",
  output: {
    file: "dist/bundle.js",
    format: "cjs",
    inlineDynamicImports: true,
  },
  plugins: [nodeResolve({ preferBuiltins: true }), json(), commonjs()],
};
