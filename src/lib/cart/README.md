# Cart integration

Use `cartStore.addItem` for direct mutations. It returns the applied quantity
and total item count, or a reason when the quantity or line limit prevented a
change.

The header uses `useCartCount` from `use-cart-snapshot.ts`. This lightweight
path depends only on the store, reducer, and cart types; it does not load or
validate against the catalog. `useCart` is the full cart/inquiry path. It
resolves catalog records once and removes persisted variants that no longer
exist.

The store treats local storage as untrusted input and retains the existing
`vestrel-house:cart` version 1 envelope and 30-day TTL. It listens for same-key
updates and `localStorage.clear()` while subscribers exist, and rebases each
mutation on the latest stored envelope to cover delayed cross-tab events.

Local storage has no atomic compare-and-swap. Two tabs that read the same
envelope and write at exactly the same time can still lose one write; the later
envelope wins. Closing that residual race would require an operation log or a
cross-tab lock and a storage schema/protocol change.
