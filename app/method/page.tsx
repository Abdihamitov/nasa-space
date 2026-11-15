import type { Metadata } from "next";
import { MethodContent } from "@/components/method/MethodContent";

export const metadata: Metadata = {
  title: "Методология",
  description:
    "Как K2 считает климатические тренды: Mann–Kendall, Hamed–Rao, наклон Сена, FDR, ограничения и источники данных.",
};

// The content is a client component so that switching RU/EN is instant and
// does not need a server round-trip (see LocaleProvider).
export default function MethodPage() {
  return <MethodContent />;
}
