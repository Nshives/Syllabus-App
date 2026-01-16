import { redirect } from "next/navigation";

export default function Home() {
  // Instantly send users to the dashboard
  redirect("/dashboard");
}