"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Accueil", icon: HomeIcon },
  { href: "/scan", label: "Scanner", icon: CameraIcon },
  { href: "/inventory", label: "Stock", icon: StackIcon },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-line bg-paper"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navigation principale"
    >
      <ul className="mx-auto max-w-md grid grid-cols-3">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className="flex flex-col items-center gap-1 py-2.5 text-xs"
                aria-current={active ? "page" : undefined}
              >
                <Icon active={active} />
                <span
                  className={
                    active ? "text-ink font-semibold" : "text-ink/55"
                  }
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"
        stroke="#211d19"
        strokeOpacity={active ? 1 : 0.55}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CameraIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect
        x="3"
        y="7"
        width="18"
        height="13"
        rx="2"
        stroke="#211d19"
        strokeOpacity={active ? 1 : 0.55}
        strokeWidth="1.8"
      />
      <path
        d="M8 7l1.2-2.2A1 1 0 0 1 10.1 4h3.8a1 1 0 0 1 .9.6L16 7"
        stroke="#211d19"
        strokeOpacity={active ? 1 : 0.55}
        strokeWidth="1.8"
      />
      <circle
        cx="12"
        cy="13.5"
        r="3.3"
        stroke="#211d19"
        strokeOpacity={active ? 1 : 0.55}
        strokeWidth="1.8"
      />
    </svg>
  );
}

function StackIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 4 21 8.5 12 13 3 8.5z"
        stroke="#211d19"
        strokeOpacity={active ? 1 : 0.55}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M3 13.5 12 18l9-4.5M3 17.5 12 22l9-4.5"
        stroke="#211d19"
        strokeOpacity={active ? 1 : 0.55}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
