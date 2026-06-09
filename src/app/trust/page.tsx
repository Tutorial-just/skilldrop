import { redirect } from "next/navigation";

export const metadata = {
  title: "Help Center | SkillDrop",
  description: "SkillDrop help center with booking, payment, safety and support guides.",
};

export default function TrustRedirectPage() {
  redirect("/help");
}
