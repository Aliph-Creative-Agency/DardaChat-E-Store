/**
 * PUBLIC contract of `engagement` (team ENGAGEMENT): transactional notifications, consent ledger, customer and
 * address records. STUB(contracts): `notify` renders built-in default ar/en texts until templates are approved.
 * Marketing sends (campaigns, segments) are internal to engagement and gated by `hasConsent`.
 */
export {
  consentPurpose,
  findCustomerByContact,
  getCustomer,
  hasConsent,
  listAddresses,
  listConsents,
  notify,
  recordConsent,
  saveAddress,
  upsertCustomer,
} from "./service";
export { TRANSACTIONAL_EVENTS } from "./types";
export type {
  AddressInput,
  AddressView,
  ConsentSource,
  ConsentView,
  ContactChannel,
  CustomerView,
  NotifyData,
  NotifyRecipient,
  NotifyResult,
  RecordConsentInput,
  TransactionalEvent,
  UpsertCustomerInput,
  UpsertCustomerResult,
} from "./types";
