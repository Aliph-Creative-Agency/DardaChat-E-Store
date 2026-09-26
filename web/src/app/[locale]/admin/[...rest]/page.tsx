import { notFound } from "next/navigation";

/** Any admin path no team has built yet renders the admin not-found inside the shell (not the site 404). */
export default function AdminUnknownSection(): never {
  notFound();
}
