"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Sparkles, X, Github } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useAssistant } from "@/components/assistant/AssistantProvider";
import { LanguageSwitch } from "@/components/i18n/LanguageSwitch";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { L } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", ru: "Карта", en: "Map" },
  { href: "/explore", ru: "Исследовать", en: "Explore" },
  { href: "/compare", ru: "Сравнение", en: "Compare" },
  { href: "/method", ru: "Метод", en: "Method" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { openWithPrompt } = useAssistant();
  const { locale } = useLocale();
  const [scrolled, setScrolled] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMobile(false), [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition duration-300",
        scrolled ? "border-b border-white/[0.07] bg-[#04070d]/80 backdrop-blur-xl" : "bg-transparent",
      )}
    >
      <div className="section flex h-16 items-center justify-between gap-4">
        <Link href="/" className="shrink-0" aria-label="K2 — на главную">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.025] p-1 backdrop-blur-md md:flex">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[12px] font-medium transition",
                  active ? "bg-white/[0.09] text-white" : "text-slate-400 hover:text-slate-100",
                )}
              >
                {L(locale, item.ru, item.en)}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitch />
          <a
            href={process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com"}
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-full p-2 text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-200 sm:block"
            aria-label="GitHub"
          >
            <Github className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={() => openWithPrompt()}
            className="hidden items-center gap-2 rounded-full border border-aurora-400/25 bg-aurora-400/[0.08] px-3.5 py-2 text-[11px] font-semibold text-aurora-200 transition hover:bg-aurora-400/15 sm:flex"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {L(locale, "AI-детектив", "AI detective")}
          </button>
          <button
            type="button"
            onClick={() => setMobile((v) => !v)}
            className="rounded-full p-2 text-slate-300 transition hover:bg-white/[0.06] md:hidden"
            aria-label={mobile ? L(locale, "Закрыть меню", "Close menu") : L(locale, "Открыть меню", "Open menu")}
            aria-expanded={mobile}
          >
            {mobile ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobile && (
        <div className="border-t border-white/[0.07] bg-[#04070d]/95 px-5 py-4 backdrop-blur-xl md:hidden">
          <div className="grid gap-1">
            {NAV.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    active ? "bg-white/[0.08] text-white" : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100",
                  )}
                >
                  {L(locale, item.ru, item.en)}
                </Link>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              setMobile(false);
              openWithPrompt();
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-aurora-400 px-3 py-2.5 text-sm font-semibold text-ink-950"
          >
            <Sparkles className="h-4 w-4" /> {L(locale, "Спросить K2 AI", "Ask K2 AI")}
          </button>
        </div>
      )}
    </header>
  );
}
