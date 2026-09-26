import { BareFrame, NotFoundContent } from "@/components/shell/StatusContent";

/** 404 for `notFound()` outside the store and admin layouts (e.g. dev tools). Store 404s keep the store chrome. */
export default function LocaleNotFound() {
  return (
    <BareFrame>
      <NotFoundContent />
    </BareFrame>
  );
}
