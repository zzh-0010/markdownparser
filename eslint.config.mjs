import globals from "globals";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    extends: "aribnb-base",
  },
  { languageOptions: { globals: globals.node } },
  ...tseslint.configs.recommended,
];
