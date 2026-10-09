"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type IconProps = { active: boolean };

const TABS = [
  { href: "/", label: "Accueil", icon: HomeIcon, match: (p: string) => p === "/" },
  {
    href: "/inventory",
    label: "Stock",
    icon: StackIcon,
    match: (p: string) => p.startsWith("/inventory") || p.startsWith("/item"),
  },
  { href: "/scan", label: "Scanner", icon: CameraIcon, match: (p: string) => p.startsWith("/scan"), center: true },
  { href: "/compta", label: "Compta", icon: ChartIcon, match: (p: string) => p.startsWith("/compta") },
  {
    href: "/plus",
    label: "Plus",
    icon: DotsIcon,
    match: (p: string) =>
      p.startsWith("/plus") || p.startsWith("/taches") || p.startsWith("/niches"),
  },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-line bg-paper"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navigation principale"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          const center = "center" in tab && tab.center;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className="flex flex-col items-center gap-1 py-2 text-xs"
                aria-current={active ? "page" : undefined}
              >
                {center ? (
                  <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full border-4 border-paper bg-chalk-red shadow-sm">
                    <CameraGlyph color="#f2eee3" />
                  </span>
                ) : (
                  <Icon active={active} />
                )}
                <span
                  className={active ? "font-semibold text-ink" : "text-ink/55"}
                >
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function stroke(active: boolean) {
  return { stroke: "#211d19", strokeOpacity: active ? 1 : 0.55, strokeWidth: 1.8 };
}

function HomeIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"
        {...stroke(active)}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StackIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 4 21 8.5 12 13 3 8.5z" {...stroke(active)} strokeLinejoin="round" />
      <path
        d="M3 13.5 12 18l9-4.5M3 17.5 12 22l9-4.5"
        {...stroke(active)}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CameraGlyph({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="7" width="18" height="13" rx="2" stroke={color} strokeWidth="1.8" />
      <path
        d="M8 7l1.2-2.2A1 1 0 0 1 10.1 4h3.8a1 1 0 0 1 .9.6L16 7"
        stroke={color}
        strokeWidth="1.8"
      />
      <circle cx="12" cy="13.5" r="3.3" stroke={color} strokeWidth="1.8" />
    </svg>
  );
}

function CameraIcon({ active }: IconProps) {
  return <CameraGlyph color={active ? "#211d19" : "#6b665f"} />;
}

function ChartIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 20V12M12 20V5M19 20v-9"
        {...stroke(active)}
        strokeLinecap="round"
      />
    </svg>
  );
}

function DotsIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="5.5" cy="12" r="1.6" fill="#211d19" fillOpacity={active ? 1 : 0.55} />
      <circle cx="12" cy="12" r="1.6" fill="#211d19" fillOpacity={active ? 1 : 0.55} />
      <circle cx="18.5" cy="12" r="1.6" fill="#211d19" fillOpacity={active ? 1 : 0.55} />
    </svg>
  );
}
