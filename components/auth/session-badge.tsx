export function SessionBadge({ email }: { email: string }) {
  return (
    <div className="fixed right-3 top-3 z-[100] hidden items-center gap-3 rounded-full border border-white/10 bg-[#111318]/90 px-3 py-2 shadow-xl backdrop-blur md:flex">
      <span className="max-w-40 truncate text-[10px] font-bold text-white/45">{email}</span>
      <form action="/auth/signout" method="post">
        <button className="rounded-full bg-white/[0.07] px-3 py-1.5 text-[10px] font-black text-[#F2C94C] transition hover:bg-white/10">
          Sign out
        </button>
      </form>
    </div>
  );
}
