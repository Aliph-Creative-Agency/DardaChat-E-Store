// Schema barrel: every module's tables. Relative imports only (drizzle-kit does not resolve the `@/` alias).
// Table → module map: .orchestration/teams/platform/lanes/core/BRIEF.md.
export * from "../modules/core/schema";
export * from "../modules/auth/schema";
export * from "../modules/engagement/schema";
export * from "../modules/catalog/schema";
