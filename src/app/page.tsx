import { redirect } from "next/navigation";
import { DEFAULT_SLUG } from "@/lib/clients";

export default function Home() {
  redirect(`/clients/${DEFAULT_SLUG}`);
}
