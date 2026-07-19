import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand/brand-logo";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AccountStatusPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("display_name,account_status,moderation_note,suspended_until").eq("id", user.id).maybeSingle();
  if (!profile || !["suspended", "banned"].includes(profile.account_status || "")) redirect("/app");
  const banned = profile.account_status === "banned";
  return <main className="flex min-h-screen items-center justify-center p-5"><section className="w-full max-w-xl rounded-[32px] border border-white/10 bg-[#101218] p-8 text-center shadow-2xl"><BrandLogo className="mx-auto" /><p className="mt-8 text-[10px] font-black tracking-[0.3em] text-red-300">ACCOUNT {banned ? "BANNED" : "SUSPENDED"}</p><h1 className="mt-3 text-4xl font-black">Your AfroLove account is under moderation.</h1><p className="mt-4 text-sm leading-6 text-white/45">{profile.moderation_note || "A safety administrator has restricted access while a moderation decision is in effect."}</p>{profile.suspended_until && !banned && <p className="mt-4 text-xs font-bold text-[#FFE58C]">Scheduled review: {new Intl.DateTimeFormat("en", { dateStyle: "long", timeStyle: "short" }).format(new Date(profile.suspended_until))}</p>}<p className="mt-6 rounded-2xl border border-blue-400/15 bg-blue-400/[0.05] p-4 text-xs leading-5 text-blue-100/50">For a future production launch, this page will include a formal appeal and support workflow.</p><form action="/auth/signout" method="post" className="mt-6"><button className="w-full rounded-2xl bg-[#F2C94C] py-3 text-sm font-black text-black">Sign out</button></form></section></main>;
}
