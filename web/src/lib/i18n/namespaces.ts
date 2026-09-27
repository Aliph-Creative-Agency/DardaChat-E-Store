/**
 * Message namespaces loaded for every request. Each is a file `messages/<locale>/<namespace>.json`; a file that does
 * not exist yet loads as `{}`, so a team starts using its namespace simply by creating the file (in both locales).
 */
export const MESSAGE_NAMESPACES = [
  "common",
  "auth",
  "core",
  "dev",
  "catalog",
  "inventory",
  "storefront",
  "orders",
  "payments",
  "engagement",
  "insights",
  "assistant",
  "journey",
] as const;

export type MessageNamespace = (typeof MESSAGE_NAMESPACES)[number];
