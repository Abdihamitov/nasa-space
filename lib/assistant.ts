import { getCatalog } from "./catalog";
import type { AssistantAction, AssistantContext } from "./types";

const PRODUCT = `K2 — «Earth System Trend Detective» для Кыргызстана (NASA Space Apps Challenge 2026).
Продукт показывает, что меняется в климате Кыргызстана, где именно и насколько по-разному.
Пользователь проходит путь: раздел → место → параметр → период → график + тренд + вывод простыми словами.
Ключевые экраны:
- / — карта Кыргызстана, глобальные явления, объекты, период.
- /explore — пошаговый выбор «раздел → место → параметр → период».
- /analysis?object=...&variable=...&from=...&to=... — результат: вывод, график, цепочка гипотез, детали, CSV.
- /compare?variable=...&from=...&to=... — автоподбор пары с противоположными трендами и таблица всех объектов.
- /method — методология, источники, ограничения.
Метод: годовая агрегация, Mann–Kendall с поправкой Хамеда–Рао на автокорреляцию, сезонный MK (Hirsch–Slack) как проверка, наклон Сена с 95% ДИ, Benjamini–Hochberg FDR для массовых сравнений. Минимум 10 лет. p<0.05 — значимый, 0.05–0.10 — слабые признаки, иначе «тренда нет».
Данные: NASA POWER (MERRA-2/GLDAS, GPM IMERG) — температура, осадки, почвенная влага, испарение, снег; NASA MODIS — NDVI и снежный покров; NOAA — глобальная температура и CO2; уровень Иссык-Куля — реконструкция по публикации Zhang et al. (2022), не сырой Hydroweb.
Ограничения: это не прогноз; тренд зависит от периода; корреляция и совпадение направлений не доказывают причинность; MODIS видит сезонный снег, а не массу ледников; Токтогул — регулируемый объект; глобальные ряды — контекст, не объяснение.`;

export function buildSystemPrompt(context: AssistantContext): string {
  const catalog = getCatalog();
  const variables = catalog.variables
    .map(
      (v) =>
        `- ${v.code}: ${v.name} (${v.unit}), раздел ${v.section}, агрегация ${v.yearlyAgg}${v.seasonMonths ? `, сезон ${v.seasonMonths.join(",")}` : ""}${v.isProxy ? ", ПРОКСИ" : ""}${v.isReconstruction ? ", РЕКОНСТРУКЦИЯ" : ""}. ${v.description}`,
    )
    .join("\n");
  const objects = catalog.objects
    .filter((o) => !o.isGrid)
    .map(
      (o) =>
        `- ${o.code}: ${o.name} (${o.type}, ${o.region}, ${o.lat.toFixed(2)},${o.lon.toFixed(2)})${o.isRegulated ? " [РЕГУЛИРУЕМЫЙ]" : ""}${o.isGlobal ? " [ГЛОБАЛЬНЫЙ]" : ""}; переменные: ${o.variables.join(", ")}`,
    )
    .join("\n");
  const phenomena = catalog.phenomena
    .map((p) => `- ${p.code}: ${p.name}. ${p.description} Оговорка: ${p.caveat}`)
    .join("\n");
  const chains = catalog.chains
    .map((c) => `- ${c.targetVariable}: ${c.name}. Звенья: ${c.links.map((l) => `${l.variable}(${l.expected})`).join(" → ")}`)
    .join("\n");

  return `${PRODUCT}

КАТАЛОГ ПЕРЕМЕННЫХ:
${variables}

КАТАЛОГ ОБЪЕКТОВ:
${objects}

ЯВЛЕНИЯ:
${phenomena}

ЦЕПОЧКИ ГИПОТЕЗ:
${chains}

ТЕКУЩИЙ КОНТЕКСТ ПОЛЬЗОВАТЕЛЯ:
${JSON.stringify(context, null, 2)}

КАК ОТВЕЧАТЬ:
1. Отвечай на языке пользователя. По умолчанию — по-русски. Кратко: 2–6 предложений, если не просят подробно.
2. Не выдумывай числа. Используй только числа из контекста (trendSummary, analysis) и каталога. Если числа нет — скажи, что нужно открыть анализ.
3. Объясняй термины простыми словами: p, q, тренд, наклон Сена, FDR, прокси.
4. Если пользователь спрашивает «что нажать» — дай конкретный путь из 2–4 шагов с названиями кнопок и объектов.
5. Если пользователь просит сравнить — предложи /compare с переменной и периодом.
6. Всегда упоминай оговорку, если речь о реконструкции, регулируемом объекте, прокси или глобальном сопоставлении.
7. Не утверждай причинность. Используй «согласуется», «может объясняться», «не доказывает».
8. ЖЁСТКО: данные доступны только за ${catalog.meta.period.from}–${catalog.meta.period.to}. Никогда не предлагай from/to вне этого диапазона, даже если пользователь просит 1990 или 2050. Если просит — объясни, что куб начинается с ${catalog.meta.period.from} года.
9. ЖЁСТКО: в действиях используй только коды object/variable из каталога выше. Не придумывай коды.
10. Если в контексте есть analysis — это готовый расчёт по запросу пользователя (объект, переменная, период, summary, p, q, наклон). Используй именно его числа и период; не пересчитывай вручную и не подменяй другими годами. Для направления и значимости бери analysis.directionLabel и analysis.confidenceLabel, а не raw-коды.
11. В конце добавь до 3 действий в формате:
[[ACTION]]{"type":"navigate","href":"/analysis?object=issyk-kul&variable=lake_level&from=2000&to=2025","label":"Открыть Иссык-Куль" }[[/ACTION]]
Допустимые type: navigate (href), set_period (from,to,label), open_compare (variable,from,to,label).
Не добавляй действий, если они не нужны. Не пиши JSON вне блока ACTION.`;
}

export function fallbackAnswer(context: AssistantContext, userText: string): { text: string; actions: AssistantAction[] } {
  const t = userText.toLowerCase();
  const actions: AssistantAction[] = [];
  const current =
    context.objectCode && context.variableCode
      ? `/analysis?object=${context.objectCode}&variable=${context.variableCode}&from=${context.from ?? 2000}&to=${context.to ?? 2025}`
      : null;
  if (current) {
    actions.push({ type: "navigate", href: current, label: "Открыть текущий анализ" });
  }
  actions.push({ type: "navigate", href: "/explore", label: "Пройти путь детектива" });
  actions.push({ type: "navigate", href: "/method", label: "Как считается тренд" });

  if (t.includes("как") && (t.includes("польз") || t.includes("работ") || t.includes("начать"))) {
    return {
      text:
        "Начните с карты на главной: выберите явление и период, затем кликните по объекту. Либо откройте «Исследовать» и пройдите четыре шага: раздел → место → параметр → период. На экране результата сверху будет вывод простыми словами, ниже — график, цепочка гипотез и блок «Подробнее» с p, q и методом. Если хотите сравнить регионы, нажмите «Сравнить».",
      actions,
    };
  }
  if (t.includes("p") || t.includes("значим") || t.includes("q") || t.includes("fdr")) {
    return {
      text:
        "p — вероятность увидеть такой тренд случайно, если тренда нет. p < 0,05 — уверенный результат; 0,05–0,10 — слабые признаки. q — то же p, но с поправкой на множественные сравнения (Benjamini–Hochberg): когда мы проверяем много объектов сразу, часть «значимых» может быть ложной. Поэтому в таблицах и на карте смотрите и на p, и на q.",
      actions,
    };
  }
  if (t.includes("почему") || t.includes("причин")) {
    return {
      text:
        "K2 показывает тренды и согласованность с гипотезами, но не доказывает причину. Например, уровень Иссык-Куля может меняться из-за осадков, притока рек, испарения и водозабора. Цепочка «температура → снег → сток → уровень» — это граф гипотез из литературы; мы проверяем, совпадают ли направления трендов, и честно помечаем звенья, которые не подтвердились.",
      actions,
    };
  }
  if (context.analysis?.summary) {
    return {
      text: `${context.analysis.summary} Хотите, разберу p и q простыми словами или предложу следующий шаг?`,
      actions,
    };
  }
  if (context.trendSummary) {
    return {
      text: `${context.trendSummary} Хотите, объясню, что это значит простыми словами, или предложу следующий шаг?`,
      actions,
    };
  }
  return {
    text:
      "Я — AI-помощник K2. Могу объяснить, что показывает график, помочь выбрать объект и период, расшифровать p/q и подсказать, куда нажать. Начните с карты или скажите, какой вопрос вас интересует: вода, снег, климат или растительность.",
    actions,
  };
}
