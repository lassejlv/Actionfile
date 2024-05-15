Bun.build({
  format: "esm",
  target: "node",
  entrypoints: ["src/index.ts"],
  outdir: "dist",
  minify: {
    whitespace: true,
  },
});
