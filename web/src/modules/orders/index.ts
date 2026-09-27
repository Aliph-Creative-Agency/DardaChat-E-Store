/**
 * PUBLIC contract of `orders` (team ORDERS): placement (thin but real), Appendix A transitions, order reads,
 * delivery zones / fees / estimates, plus the shared state-machine tables. STUB(contracts): discounts, free-delivery
 * thresholds, backorders, prepaid reservation expiry and the per-transition side effects.
 */
export {
  estimateDelivery,
  getOrder,
  listCustomerOrders,
  listDeliveryZones,
  listOrderEvents,
  placeOrder,
  quoteDeliveryFee,
  transition,
} from "./service";
export {
  allowedTransitions,
  assertTransition,
  canTransition,
  completionAllowed,
  FULFILMENT_STATES,
  FULFILMENT_TERMINAL,
  FULFILMENT_TRANSITIONS,
  isFulfilmentState,
  isPaymentState,
  PAYMENT_STATES,
  PAYMENT_TERMINAL,
  PAYMENT_TRANSITIONS,
  TransitionError,
} from "./state-machine";
export type { FulfilmentState, Machine, PaymentState, Transition } from "./state-machine";
export type {
  DeliveryEstimate,
  DeliveryZoneView,
  OrderAddressSnapshot,
  OrderLineView,
  OrderPaymentMethod,
  OrderSummary,
  OrderTotalsView,
  OrderView,
  PlaceOrderInput,
  PlaceOrderLineInput,
  PlaceOrderResult,
  TransitionInput,
  TransitionResult,
} from "./types";
