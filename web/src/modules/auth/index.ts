/**
 * PUBLIC CONTRACT of the auth module. Other modules import only from `@/modules/auth`.
 * Server-only pieces (cookies, redirects) come from ./next; pure helpers take a `db` argument.
 */
export {
  AuthError,
  clearSessionCookie,
  customerRoute,
  getCurrentCustomer,
  getCurrentStaff,
  getStaffContext,
  requestMeta,
  requireCustomer,
  requireStaff,
  safeNext,
  setSessionCookie,
  staffAction,
  staffRoute,
} from "./next";
export {
  can,
  permissionsOf,
  type CurrentCustomer,
  type CurrentStaff,
  type Locale,
  type StaffContext,
  type StaffDenyReason,
} from "./guards";
export {
  grantsFor,
  isKnownPermission,
  PERMISSION_KEYS,
  PERMISSIONS,
  type Permission,
  type RoleKey,
} from "./permissions";
export { audit, auditedMutation, changed, listAuditEntries, type AuditEntry, type AuditInput } from "./audit";
export {
  clientIp,
  DbRateLimitStore,
  LIMITS,
  rateLimit,
  rateLimitAll,
  type RateLimitResult,
  type RateLimitStore,
} from "./rate-limit";
export { revokeAllSessions, type SubjectType } from "./session";
export { issueOtp, verifyOtp, type IssueOtpResult, type OtpTarget, type VerifyOtpResult } from "./otp";
export { outboxOtpDelivery, type OtpChannel, type OtpDelivery, type OtpPurpose } from "./otp-delivery";
export { outboxResetLinkDelivery, type ResetLinkDelivery } from "./otp-delivery";
