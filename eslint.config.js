const globals = {
  window: "readonly", document: "readonly", navigator: "readonly", localStorage: "readonly",
  sessionStorage: "readonly", console: "readonly", Intl: "readonly", Date: "readonly",
  Set: "readonly", Map: "readonly", Math: "readonly", String: "readonly", Number: "readonly",
  Boolean: "readonly", Array: "readonly", Object: "readonly", JSON: "readonly", Error: "readonly",
  Promise: "readonly", RegExp: "readonly", URL: "readonly", Blob: "readonly", TextEncoder: "readonly",
  crypto: "readonly", setTimeout: "readonly", clearTimeout: "readonly", fetch: "readonly",
  caches: "readonly", self: "readonly", Response: "readonly", HTMLElement: "readonly",
  IntersectionObserver: "readonly", matchMedia: "readonly", confirm: "readonly", alert: "readonly",
  Event: "readonly", CustomEvent: "readonly", location: "readonly"
};

export default [
  {
    files: ["script.js", "sw.js", "verify-project.cjs"],
    languageOptions: { ecmaVersion: "latest", sourceType: "script", globals },
    rules: {
      "no-unused-vars": ["error", { args: "none", caughtErrors: "none" }],
      "no-undef": "error",
      "no-unreachable": "error",
      "no-dupe-keys": "error",
      "no-constant-condition": "error"
    }
  }
];
