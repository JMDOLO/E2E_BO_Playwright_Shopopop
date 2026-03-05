import playwright from "eslint-plugin-playwright";
import tseslint from "typescript-eslint";

export default [
  ...tseslint.configs.recommended,
  {
    ...playwright.configs["flat/recommended"],
    files: ["tests/**/*.ts"],
    ignores: ["tests/Tools/manual-cleanup.spec.ts"],
    rules: {
      ...playwright.configs["flat/recommended"].rules,
      // Playwright fixtures destructure { page } even when passed to POM
      "@typescript-eslint/no-unused-vars": ["error", { args: "none" }],
      // POM methods that contain expect() internally (e.g. deliveryUpdateSuccessToaster)
      "playwright/expect-expect": ["warn", { assertFunctionNames: ["expect",
        "waitForDeliveryCreationAndRetry",
        "deliveryUpdateSuccessToaster",
        "sendEmailSuccessToaster",
        "createDeliveryForInternal",
        "createDeliveryForPro",
        "createDeliveryAPI",
        "checkHistoryMessage"] }],
    },
  },
];
