import Image from "next/image";
import { initialsFromName } from "@/lib/profile";

export function SessionBadge({
  email,
  name,
  avatarUrl,
}: {
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
}) {
  const label = name?.trim() || email;

  return (
    <div className="fixed right-3 top-3 z-[100] hidden items-center gap-2 rounded-full border border-white/10 bg-[#111318]/90 p-1.5 pl-2 shadow-xl backdrop-blur md:flex">
      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F2C94C] text-[10px] font-black text-black">
        {avatarUrl ? (
          <Image src={avatarUrl} alt={label} fill sizes="32px" className="object-cover" />
        ) : (
          initialsFromName(label)
        )}
      </div>
      <span className="max-w-40 truncate text-[10px] font-bold text-white/50">{label}</span>
      <form action="/auth/signout" method="post">
        <button className="rounded-full bg-white/[0.07] px-3 py-2 text-[10px] font-black text-[#F2C94C] transition hover:bg-white/10">
          Sign out
        </button>
      </form>
    </div>
  );
}
