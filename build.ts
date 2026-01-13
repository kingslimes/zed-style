import { build } from "bun"

await build({
    entrypoints: ["./src/index.ts"],
    outdir: "./builder/dist",
    format: "esm",
    sourcemap: "none",
    minify: {
        syntax: true,
        keepNames: true,
        whitespace: true,
        identifiers: false
    },
    splitting: false,
    external: [
        "csstype",
        "postcss",
        "autoprefixer"
    ]
})
