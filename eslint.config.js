import eslintRecommended from "@eslint/js/configs/recommended";
import reactRecommended from "eslint-plugin-react/configs/recommended";
import tsRecommended from "@typescript-eslint/eslint-plugin/configs/recommended";

export default [
  eslintRecommended,
  reactRecommended,
  tsRecommended,
  {
    files: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
      },
    },
  },
];