import { notFound } from "next/navigation";

/** Any path no page claims renders the localized storefront 404 (HTTP 404) inside the store layout. */
export default function UnknownPage(): never {
  notFound();
}
