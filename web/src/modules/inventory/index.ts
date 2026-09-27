/**
 * PUBLIC contract of `inventory` (team INVENTORY): availability, reservations for carts/orders, locations (origins)
 * and the stock-ledger operations other modules trigger (dispatch, return receipt, write-off, shortfall).
 * Real: getAvailability, reserve, release, listLocations, requestBackInStock (insert).
 * STUB(contracts): commitDispatch, restoreOnReceipt, writeOff, recordShortfall (typed, no ledger writes yet).
 */
export {
  commitDispatch,
  getAvailability,
  listLocations,
  recordShortfall,
  release,
  requestBackInStock,
  reserve,
  restoreOnReceipt,
  writeOff,
} from "./service";
export type {
  Availability,
  BackInStockInput,
  CommitDispatchInput,
  LocationStock,
  LocationView,
  RecordShortfallInput,
  ReservationOwnerType,
  ReservationRef,
  ReserveInput,
  RestoreOnReceiptInput,
  StockLineInput,
  StockMovementResult,
  WriteOffInput,
} from "./types";
