"use client";

import { ErrorContent } from "@/components/shell/StatusContent";

/** Back-office error boundary: keeps the sidebar and top bar. */
export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorContent digest={error.digest} retry={retry} />;
}
