import Image from "next/image";
import Link from "next/link";

type BrandLogoProps = {
  href?: string;
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  priority?: boolean;
  className?: string;
};

const sizes = {
  sm: {
    icon: "h-8 w-8 rounded-xl",
    name: "text-[11px] tracking-[0.2em]",
    tagline: "text-[7px] tracking-[0.11em]",
    imageSizes: "32px",
  },
  md: {
    icon: "h-10 w-10 rounded-2xl",
    name: "text-sm tracking-[0.22em]",
    tagline: "text-[8px] tracking-[0.12em]",
    imageSizes: "40px",
  },
  lg: {
    icon: "h-12 w-12 rounded-[18px]",
    name: "text-lg tracking-[0.22em]",
    tagline: "text-[9px] tracking-[0.13em]",
    imageSizes: "48px",
  },
} as const;

export function BrandLogo({
  href,
  size = "md",
  showTagline = false,
  priority = false,
  className = "",
}: BrandLogoProps) {
  const config = sizes[size];

  const content = (
    <span className={`inline-flex min-w-0 items-center gap-3 ${className}`}>
      <span
        className={`relative shrink-0 overflow-hidden border border-[#ff4d4d]/30 bg-[#35100f] shadow-[0_0_24px_rgba(255,65,65,0.2)] ${config.icon}`}
      >
        <Image
          src="/brand/afrolove-app-icon.png"
          alt=""
          fill
          priority={priority}
          sizes={config.imageSizes}
          className="object-cover"
        />
      </span>
      <span className="min-w-0 leading-none">
        <span className={`block truncate font-black text-white ${config.name}`}>
          AFRO<span className="text-[#ff5252]">LOVE</span>
        </span>
        {showTagline && (
          <span
            className={`mt-1 block truncate font-bold uppercase text-[#F2C94C]/75 ${config.tagline}`}
          >
            One Africa. Real connections.
          </span>
        )}
      </span>
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} aria-label="AfroLove home" className="inline-flex">
      {content}
    </Link>
  );
}

export function BrandArtwork({
  priority = false,
  className = "",
}: {
  priority?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(120deg,#270c0c_0%,#111318_58%,#17191f_100%)] shadow-[0_20px_60px_rgba(0,0,0,0.45)] ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_26%_52%,rgba(255,68,68,0.34),transparent_34%),radial-gradient(circle_at_78%_45%,rgba(255,255,255,0.08),transparent_36%)]" />
      <div className="relative flex h-full items-center justify-center gap-4 px-5 py-5 sm:gap-5 sm:px-7">
        <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[22px] border border-[#ff6666]/35 bg-[#3a1110] shadow-[0_0_32px_rgba(255,66,66,0.34)] sm:h-20 sm:w-20">
          <Image
            src="/brand/afrolove-app-icon.png"
            alt=""
            fill
            priority={priority}
            sizes="80px"
            className="object-cover"
          />
        </span>
        <span className="min-w-0">
          <span className="block whitespace-nowrap text-3xl font-black tracking-[-0.045em] text-white sm:text-4xl">
            Afro<span className="text-[#ff5252]">Love</span>
          </span>
          <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.18em] text-[#F2C94C]/75 sm:text-[10px]">
            One Africa. Real connections.
          </span>
        </span>
      </div>
    </div>
  );
}
