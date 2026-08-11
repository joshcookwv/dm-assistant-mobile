module.exports = {
  preset: "jest-expo",
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  collectCoverageFrom: ["src/lib/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
};
