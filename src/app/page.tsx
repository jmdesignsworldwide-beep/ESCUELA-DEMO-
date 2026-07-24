import { redirect } from "next/navigation";

export default function RootPage() {
  // El middleware envía a /login si no hay sesión.
  redirect("/dashboard");
}
