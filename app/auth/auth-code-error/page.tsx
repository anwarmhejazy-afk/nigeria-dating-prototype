import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

export default function AuthCodeErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#111318] p-7 text-center shadow-2xl">
        <div className="flex justify-center">
          <BrandLogo href="/" size="md" showTagline />
        </div>
        <div className="mx-auto mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-red-400/10 text-2xl">
          !
        </div>
        <h1 className="mt-5 text-2xl font-black">
          This secure link could not be verified
        </h1>
        <p className="mt-3 text-sm leading-6 text-white/45">
          The link may have expired or already been used. Request a new email
          and try again.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex rounded-2xl bg-[#F2C94C] px-6 py-3 text-sm font-black text-black"
        >
          Return to sign in
        </Link>
      </div>
    </main>
  );
}
