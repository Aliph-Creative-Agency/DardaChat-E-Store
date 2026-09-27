"use client";

import { BareFrame, ErrorContent } from "@/components/shell/StatusContent";

/** Error boundary for pages outside the store and admin layouts. */
export default function LocaleError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <BareFrame>
      <ErrorContent digest={error.digest} retry={retry} />
    </BareFrame>
  );
}
