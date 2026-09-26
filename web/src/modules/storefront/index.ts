/**
 * PUBLIC contract of `storefront` (team STOREFRONT): intentionally empty — nothing calls the storefront. Carts and
 * checkout sessions are private to it; it is a consumer of catalog, inventory (reserve/release for carts), orders
 * (placeOrder), payments (computeTotals, initiatePayment) and engagement (customers, consent).
 */
export {};
