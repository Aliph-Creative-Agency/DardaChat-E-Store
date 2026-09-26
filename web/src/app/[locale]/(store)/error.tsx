"use client";

import { ErrorContent } from "@/components/shell/StatusContent";

/** Storefront error boundary: keeps the header/footer, offers "try again". */
export default function StoreError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorContent digest={error.digest} retry={retry} />;
}
