"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    href: "/cases/new",
    label: "Live Call"
  },
  {
    href: "/cases/new/integrations",
    label: "Integrations"
  }
];

export function IntakeTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = pathname === tab.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              active
                ? "bg-[var(--foreground)] text-white shadow-token-md"
                : "border border-[var(--border)] bg-white/85 text-[var(--foreground)] shadow-token-md hover:-translate-y-0.5"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
