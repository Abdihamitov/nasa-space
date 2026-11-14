"use client";

import { AlertTriangle, Database, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "./Badge";
import { InfoTip } from "./InfoTip";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { L } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Confidence, TrendDirection } from "@/lib/types";

function useLabels() {
  const { locale } = useLocale();
  return { locale, L };
}

export function TrendBadge({
  direction,
  confidence,
  className,
  compact = false,
}: {
  direction: TrendDirection;
  confidence: Confidence;
  className?: string;
  compact?: boolean;
}) {
  const { locale, L } = useLabels();
  if (confidence === "insufficient") {
    return (
      <Badge tone="slate" className={className}>
        <AlertTriangle className="h-3 w-3" /> {L(locale, "мало данных", "not enough data")}
      </Badge>
    );
  }
  if (confidence === "none") {
    return (
      <Badge tone="slate" className={className}>
        <Minus className="h-3 w-3" /> {L(locale, "тренда нет", "no trend")}
      </Badge>
    );
  }
  const rising = direction === "rising";
  const tone = confidence === "confident" ? (rising ? "aurora" : "ember") : "solar";
  const Icon = rising ? TrendingUp : TrendingDown;
  return (
    <Badge tone={tone} className={className}>
      <Icon className="h-3 w-3" />
      {compact
        ? L(locale, rising ? "рост" : "снижение", rising ? "rising" : "falling")
        : L(
            locale,
            `${rising ? "рост" : "снижение"} · ${confidence === "confident" ? "уверенный" : "слабый"}`,
            `${rising ? "rising" : "falling"} · ${confidence === "confident" ? "confident" : "weak"}`,
          )}
    </Badge>
  );
}

export function ConfidenceBadge({ confidence, className }: { confidence: Confidence; className?: string }) {
  const { locale, L } = useLabels();
  const map: Record<Confidence, { ru: string; en: string; tone: "aurora" | "solar" | "slate" }> = {
    confident: { ru: "уверенный", en: "confident", tone: "aurora" },
    weak: { ru: "слабый", en: "weak", tone: "solar" },
    none: { ru: "не выявлен", en: "not found", tone: "slate" },
    insufficient: { ru: "мало данных", en: "not enough data", tone: "slate" },
  };
  const m = map[confidence];
  return (
    <Badge tone={m.tone} className={className}>
      {L(locale, m.ru, m.en)}
    </Badge>
  );
}

export function SourceFlags({
  isProxy,
  isReconstruction,
  isRegulated,
  proxyNote,
  reconstructionNote,
  regulatedNote,
  className,
}: {
  isProxy?: boolean;
  isReconstruction?: boolean;
  isRegulated?: boolean;
  proxyNote?: string;
  reconstructionNote?: string;
  regulatedNote?: string;
  className?: string;
}) {
  const { locale, L } = useLabels();
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {isProxy && (
        <span className="inline-flex items-center gap-1.5">
          <Badge tone="ice">
            <Database className="h-3 w-3" /> {L(locale, "прокси", "proxy")}
          </Badge>
          <InfoTip label={L(locale, "Что такое прокси-показатель", "What is a proxy?")}>
            {proxyNote ??
              L(
                locale,
                "Косвенный показатель: измеряет не то, что написано в названии напрямую, а связанную величину.",
                "An indirect indicator: it measures a related quantity, not the headline variable directly.",
              )}
          </InfoTip>
        </span>
      )}
      {isReconstruction && (
        <span className="inline-flex items-center gap-1.5">
          <Badge tone="violet">{L(locale, "реконструкция", "reconstruction")}</Badge>
          <InfoTip label={L(locale, "Что такое реконструкция", "What is a reconstruction?")}>
            {reconstructionNote ??
              L(
                locale,
                "Ряд собран по опубликованным данным и темпам, а не является сырыми наблюдениями.",
                "The series is assembled from published values and rates; it is not raw observations.",
              )}
          </InfoTip>
        </span>
      )}
      {isRegulated && (
        <span className="inline-flex items-center gap-1.5">
          <Badge tone="solar">{L(locale, "регулируемый объект", "regulated object")}</Badge>
          <InfoTip label={L(locale, "Почему регулируемый", "Why regulated?")}>
            {regulatedNote ??
              L(
                locale,
                "Уровень или сток зависит от режима ГЭС/водохранилища, а не только от климата.",
                "Level or flow depends on reservoir/HPP operations, not only on climate.",
              )}
          </InfoTip>
        </span>
      )}
    </div>
  );
}
