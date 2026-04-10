// source.config.ts
import { defineCollections, defineConfig } from "fumadocs-mdx/config";
var docs = defineCollections({
  dir: "content/docs",
  type: "doc"
});
var meta = defineCollections({
  dir: "content/docs",
  type: "meta"
});
var source_config_default = defineConfig();
export {
  source_config_default as default,
  docs,
  meta
};
