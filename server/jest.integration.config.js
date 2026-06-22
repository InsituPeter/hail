module.exports = {
  testEnvironment: "node",
  globalSetup: "./__tests__/integration/globalSetup.js",
  setupFiles: ["./__tests__/integration/setupFiles.js"],
  testMatch: ["**/__tests__/integration/**/*.test.js"],
}
