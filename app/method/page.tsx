import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Database,
  FlaskConical,
  GitBranch,
  Info,
  Layers,
  LineChart,
  ShieldAlert,
  Sigma,
  Sparkles,
  Timer,
  TriangleAlert,
} from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Badge } from "@/components/ui/Badge";
import { Accordion } from "@/components/ui/Accordion";
import { getLocale } from "@/lib/i18n-server";
import { L } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Методология",
  description:
    "Как K2 считает климатические тренды: Mann–Kendall, Hamed–Rao, наклон Сена, FDR, ограничения и источники данных.",
};

const PIPELINE = [
  { n: "01", title: "Месячный куб", titleEn: "Monthly cube", text: "Нормализованные ряды по объектам, единицы и QA-флаги.", textEn: "Normalised series per object, units and QA flags.", icon: Database },
  { n: "02", title: "Годовая агрегация", titleEn: "Annual aggregation", text: "Среднее / сумма / максимум по правилу переменной; минимум 10 лет.", textEn: "Mean / sum / max by variable rule; at least 10 years.", icon: Layers },
  { n: "03", title: "Mann–Kendall", titleEn: "Mann–Kendall", text: "Непараметрический тест; поправка Хамеда–Рао при автокорреляции.", textEn: "Non-parametric test; Hamed–Rao correction under autocorrelation.", icon: Sigma },
  { n: "04", title: "Наклон Сена", titleEn: "Sen slope", text: "Медиана парных наклонов + 95 % доверительный интервал.", textEn: "Median pairwise slope + 95% confidence interval.", icon: LineChart },
  { n: "05", title: "FDR", titleEn: "FDR", text: "Benjamini–Hochberg для массовых сравнений: p и q.", textEn: "Benjamini–Hochberg for mass comparisons: p and q.", icon: GitBranch },
  { n: "06", title: "Вывод и оговорка", titleEn: "Verdict and caveat", text: "Числа, простые слова и честная граница интерпретации.", textEn: "Numbers, plain language and an honest interpretation boundary.", icon: Sparkles },
];

const SOURCES = [
  {
    name: "NASA POWER",
    what: "Температура, осадки, почвенная влага, испарение, глубина снега, снегопад",
    detail: "MERRA-2 / GLDAS land surface, GPM IMERG; 0,25°–0,5°, monthly, 2000–2025",
    license: "NASA Open Data",
    href: "https://power.larc.nasa.gov/",
  },
  {
    name: "NOAA NCEI",
    what: "Аномалия глобальной температуры",
    detail: "NOAAGlobalTemp v6; monthly, 2000–2025",
    license: "Public domain (U.S. Government)",
    href: "https://www.ncei.noaa.gov/",
  },
  {
    name: "NOAA GML",
    what: "Концентрация CO₂",
    detail: "Mauna Loa; monthly, 2000–2025",
    license: "Public domain (U.S. Government)",
    href: "https://gml.noaa.gov/ccgg/trends/",
  },
  {
    name: "GeoBoundaries",
    what: "Границы 7 областей Кыргызстана",
    detail: "ADM1, WGS84, ODbL",
    license: "ODbL 1.0",
    href: "https://www.geoboundaries.org/",
  },
  {
    name: "Zhang et al., 2022",
    what: "Опорные значения уровня Иссык-Куля",
    detail: "Реконструкция по in situ, CryoSat-2 и ICESat-2; не сырой Hydroweb",
    license: "CC BY 4.0 (публикация)",
    href: "https://doi.org/10.3390/rs14071575",
  },
  {
    name: "Collaud Coen et al., 2020",
    what: "Prewhitening, временная гранулярность и Mann–Kendall",
    detail: "Atmos. Meas. Tech. 13, 6945–6964; сравнение PW, TFPW-Y, TFPW-WS, VCTFPW и 3PW",
    license: "CC BY 4.0",
    href: "https://doi.org/10.5194/amt-13-6945-2020",
  },
];

export default async function MethodPage() {
  const locale = await getLocale();
  return (
    <div className="section pb-20 pt-10">
      {/* hero */}
      <div className="max-w-3xl">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="h-px w-8 bg-aurora-400/60" />
          <span className="label text-aurora-300/90">методология</span>
        </div>
        <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-slate-50 text-balance sm:text-5xl">
          {L(locale, "Тренд — это не мнение.", "A trend is not an opinion.")}
          <br />
          <span className="text-gradient-aurora">{L(locale, "Но и не пророчество.", "But it is not a prophecy either.")}</span>
        </h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-400">
          {L(
            locale,
            "Как K2 считает тренды, почему p и q — разные числа, где заканчивается статистика и начинается интерпретация. Мы показываем не только результат, но и его предел.",
            "How K2 computes trends, why p and q are different numbers, and where statistics ends and interpretation begins. We show not only the result, but also its limit.",
          )}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Badge tone="aurora">Mann–Kendall</Badge>
          <Badge tone="ice">Hamed–Rao</Badge>
          <Badge tone="solar">Sen slope + CI</Badge>
          <Badge tone="violet">Benjamini–Hochberg</Badge>
          <Badge tone="slate">минимум 10 лет</Badge>
        </div>
      </div>

      {/* pipeline */}
      <div className="mt-12 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        {PIPELINE.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={s.n} className="relative rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] tracking-[0.2em] text-slate-600">{s.n}</span>
                <Icon className="h-4 w-4 text-aurora-300/80" />
              </div>
              <div className="mt-4 font-display text-[12px] font-semibold text-slate-100">{L(locale, s.title, s.titleEn)}</div>
              <p className="mt-1 text-[9px] leading-relaxed text-slate-500">{L(locale, s.text, s.textEn)}</p>
              {i < PIPELINE.length - 1 && (
                <ArrowRight className="absolute -right-2 top-1/2 hidden h-3 w-3 -translate-y-1/2 text-slate-700 lg:block" />
              )}
            </div>
          );
        })}
      </div>

      {/* detailed */}
      <div className="mt-16 grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="label mb-2">{L(locale, "коротко", "in brief")}</div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-50">{L(locale, "Четыре решения, которые всё меняют", "Four decisions that change everything")}</h2>
          <p className="mt-3 text-[12px] leading-relaxed text-slate-500">
            {L(
              locale,
              "Эти четыре пункта отвечают на главные методологические риски климатических дашбордов: сезонность, автокорреляцию, выбросы и множественные сравнения.",
              "These four choices address the main methodological risks of climate dashboards: seasonality, autocorrelation, outliers and multiple comparisons.",
            )}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              icon: Timer,
              title: "Годовые значения",
              text: "Убираем сезонный цикл до теста. Минимум 10 валидных лет; год с покрытием меньше 75 % сезона не попадает в агрегат.",
            },
            {
              icon: Sigma,
              title: "Mann–Kendall + Hamed–Rao",
              text: "Тест по знакам пар не требует нормальности. При значимой автокорреляции применяется полная поправка Хамеда–Рао: ранги детрендированного ряда, все значимые лаги, инфляция дисперсии.",
            },
            {
              icon: LineChart,
              title: "Наклон Сена",
              text: "Медиана парных наклонов устойчива к экстремумам. Даём 95 % доверительный интервал, а не одно число.",
            },
            {
              icon: GitBranch,
              title: "FDR-поправка",
              text: "При 20 объектах и 10 переменных ложные открытия почти гарантированы. Считаем q по Benjamini–Hochberg и показываем его рядом с p.",
            },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.title} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-aurora-400/20 bg-aurora-400/10 text-aurora-300">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="mt-4 font-display text-[13px] font-semibold text-slate-100">{c.title}</div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">{c.text}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="prose-k2 mt-16 max-w-3xl">
        {locale === "en" && (
          <div className="mb-6 rounded-xl border border-aurora-400/15 bg-aurora-400/[0.04] px-4 py-3 text-[11px] leading-relaxed text-aurora-100/70">
            The detailed methodology below is written in Russian. The interface, charts, analysis and AI assistant are
            available in English via the RU/EN switch.
          </div>
        )}
        <h2 id="why">Почему годовые значения, а не месячные?</h2>
        <p>
          Месячный ряд содержит сезонный цикл: в горах Кыргызстана температура января и июля отличается на десятки
          градусов. Если подать такой ряд в Mann–Kendall напрямую, тест будет реагировать на сезонность и
          автокорреляцию, а не на многолетний сигнал. Поэтому основной тест считается на годовых агрегатах: среднее,
          сумма или максимум — по правилу переменной. Для сезонных переменных сезон задаётся отдельно.
        </p>
        <p>
          Сезонный Mann–Kendall (Hirsch–Slack) считается на месячных данных как проверка устойчивости. Если годовой и
          сезонный тесты расходятся, в блоке «Подробнее» видны оба результата — это повод не делать поспешный вывод.
        </p>

        <h2 id="mk">Mann–Kendall: почему не обычная регрессия</h2>
        <p>
          Mann–Kendall — непараметрический тест на монотонный тренд. Он сравнивает все пары значений по знаку и не
          требует нормального распределения. Ему не мешают пропуски: тест штатно работает с неполными рядами. Именно
          поэтому мы <strong>не заполняем пропуски интерполяцией</strong> — это добавило бы искусственную
          автокорреляцию и завысило бы значимость.
        </p>
        <p>
          При значимой автокорреляции применяется <strong>полная поправка Хамеда–Рао (1998)</strong>: ряд
          детрендируется наклоном Сена, ранжируется, считается автокорреляция рангов, и дисперсия S инфлируется по
          всем значимым лагам. Это не lag-1 приближение. Использованный метод, r₁ и факт применения поправки всегда
          указаны в результате.
        </p>

        <h2 id="prewhitening">Prewhitening или поправка дисперсии?</h2>
        <p>
          Prewhitening и инфляция дисперсии — два разных способа борьбы с автокорреляцией. Collaud Coen et al. (2020)
          показали, что prewhitening может как снижать ложные срабатывания, так и удалять реальный тренд и повышать
          ошибку II рода; особенно это заметно у TFPW-Y. Мы используем второй класс методов — поправку дисперсии
          Хамеда–Рао — и применяем её только когда автокорреляция значима. Дополнительно считаем сезонный MK
          (Hirsch–Slack) как независимую проверку.
        </p>
        <p>
          Это осознанный компромисс: мы не «улучшаем» ряд prewhitening-ом, который может стереть искомый сигнал.
          Если нужен полный 3PW-конвейер (PW + TFPW-Y + VCTFPW), это следующий шаг roadmap; текущая реализация
          проверена на pymannkendall и не выдаёт себя за 3PW.
        </p>

        <h2 id="sen">Наклон Сена и доверительный интервал</h2>
        <p>
          Скорость изменения — медиана всех парных наклонов между годами. В отличие от OLS, она устойчива к выбросам:
          один аномальный год не переворачивает оценку. Мы показываем 95 % доверительный интервал: если он пересекает
          ноль, направление тренда не определено.
        </p>

        <h2 id="fdr">p и q: почему одного p мало</h2>
        <p>
          p — вероятность увидеть такой тренд случайно, если тренда нет. q — то же p, но с поправкой на множественные
          сравнения (Benjamini–Hochberg). Когда мы сканируем 20 объектов и 10 переменных, часть «значимых» результатов
          на чистом шуме почти неизбежна. Поэтому в таблицах и на карте рядом с p всегда есть q. Если q больше 0,05,
          результат может быть ложным открытием — даже если p меньше 0,05.
        </p>

        <h2 id="outliers">Выбросы и пропуски: мы их не прячем</h2>
        <p>
          Экстремум — не шум. Паводки, волны жары и аномальные годы формируют тренд. Мы не удаляем выбросы: они
          остаются в ряду и помечаются на графике. Пропуски не заполняются; длинные разрывы честно видны. Если
          покрытие ряда ниже порога, результат помечается как «недостаточно данных», а не дотягивается до 10 лет
          искусственно.
        </p>

        <h2 id="chain">Цепочка гипотез — не цепочка причин</h2>
        <p>
          Любые два трендовых ряда могут коррелировать по построению (spurious correlation). Поэтому мы не строим
          причинную цепочку на лету. Вместо этого есть фиксированный граф гипотез из литературы: температура → снег →
          почвенная влага → испарение → уровень. По каждому звену показываем знак тренда, значимость, лаг и статус
          «согласуется / противоречит / нет данных». Неподтвердившееся звено — тоже результат.
        </p>

        <h2 id="years">«Сколько лет до значимости» — это проекция</h2>
        <p>
          Если тренд не значим, мы иллюстративно продлеваем ряд текущим наклоном Сена с остаточной шумовой
          компонентой и смотрим, когда Mann–Kendall достигнет p &lt; 0,05. Это <strong>не прогноз</strong>: реальный
          климат может изменить режим. Мы показываем год как сценарий «если темп сохранится», а не как обещание.
        </p>

        <h2 id="global">Глобальное и местное: сопоставление, не атрибуция</h2>
        <p>
          График местного ряда рядом с глобальной аномалией помогает увидеть контекст, но не доказывает, что глобальный
          процесс вызвал именно это местное изменение. Разные высоты, типы поверхности, водозабор и режим ГЭС могут
          давать собственный сигнал.
        </p>

        <h2 id="limits">Что мы не делаем</h2>
        <ul>
          <li>Не прогнозируем будущее и не экстраполируем тренд.</li>
          <li>Не утверждаем причинность по корреляции.</li>
          <li>Не измеряем массу ледников по снежному покрову MODIS.</li>
          <li>Не запрашиваем NASA API в момент клика: куб собран заранее, демо работает на загруженных данных.</li>
          <li>Не скрываем пропуски, реконструкции и регулируемые объекты.</li>
          <li>Не называем «трендом» разницу двух точек.</li>
        </ul>
      </div>

      {/* validation */}
      <section id="validation" className="mt-16 scroll-mt-24">
        <SectionHeading
          eyebrow={L(locale, "валидация", "validation")}
          title={L(locale, "Мы сверили MK с pymannkendall", "We validated MK against pymannkendall")}
          description={L(
            locale,
            "Это не «на глаз»: те же годовые ряды из куба прогнаны через эталонную Python-реализацию. p, z, τ и наклон Сена совпадают.",
            "This is not eyeballing: the same annual series were run through the reference Python implementation. p, z, τ and the Sen slope match.",
          )}
        />
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/[0.08]">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.025]">
                <th className="px-4 py-3 text-[9px] uppercase tracking-wider text-slate-500">ряд</th>
                <th className="px-4 py-3 text-[9px] uppercase tracking-wider text-slate-500">p (K2)</th>
                <th className="px-4 py-3 text-[9px] uppercase tracking-wider text-slate-500">p (pymannkendall)</th>
                <th className="px-4 py-3 text-[9px] uppercase tracking-wider text-slate-500">τ</th>
                <th className="px-4 py-3 text-[9px] uppercase tracking-wider text-slate-500">Sen slope</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Бишкек · температура, 2000–2025", "0,024561", "0,024561", "0,3169", "0,02303 °C/год"],
                ["Иссык-Куль · уровень, 2000–2025", "0,874314", "0,874314", "−0,0431", "−0,00294 м/год"],
                ["Энильчек · снежный сезон, 2000–2025", "0,034172", "0,034172", "0,4031", "1,47059 дней/год"],
              ].map((row) => (
                <tr key={row[0]} className="border-b border-white/[0.05] last:border-0">
                  <td className="px-4 py-3 text-[11px] text-slate-300">{row[0]}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-aurora-300">{row[1]}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{row[2]}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{row[3]}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{row[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
          pymannkendall: <code>hamed_rao_modification_test</code>, α = 0,05; τ — tau-a, как в pymannkendall; наклон —
          Sen. Тесты в репозитории фиксируют эти значения как regression guard. Различия в последнем знаке p —
          аппроксимация нормального распределения, не метод.
        </p>
      </section>

      {/* sources */}
      <section id="sources" className="mt-16 scroll-mt-24">
        <SectionHeading
          eyebrow="происхождение данных"
          title={L(locale, "Источники и лицензии", "Sources and licenses")}
          description={L(
            locale,
            "Каждый ряд в продукте связан с источником, набором, лицензией и рекомендуемым цитированием. Это не «данные из интернета».",
            "Every series is linked to a source, dataset, license and recommended citation. This is not “data from the internet”.",
          )}
        />
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/[0.08]">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.025]">
                <th className="px-4 py-3 text-[9px] uppercase tracking-wider text-slate-500">источник</th>
                <th className="px-4 py-3 text-[9px] uppercase tracking-wider text-slate-500">что берём</th>
                <th className="px-4 py-3 text-[9px] uppercase tracking-wider text-slate-500">детали</th>
                <th className="px-4 py-3 text-[9px] uppercase tracking-wider text-slate-500">лицензия</th>
              </tr>
            </thead>
            <tbody>
              {SOURCES.map((s) => (
                <tr key={s.name} className="border-b border-white/[0.05] last:border-0">
                  <td className="px-4 py-3">
                    <a href={s.href} target="_blank" rel="noreferrer" className="text-[11px] font-medium text-aurora-300 hover:text-aurora-200">
                      {s.name}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-[10px] text-slate-400">{s.what}</td>
                  <td className="px-4 py-3 text-[10px] text-slate-500">{s.detail}</td>
                  <td className="px-4 py-3 text-[10px] text-slate-500">{s.license}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-solar-400/15 bg-solar-400/[0.035] px-4 py-3 text-[10px] leading-relaxed text-solar-100/70">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-solar-300" />
          <span>
            MODIS NDVI и снежный покров не включены в текущую сборку: публичный ORNL subset API отдаёт 26-летний
            точечный ряд слишком медленно для воспроизводимой сборки. Это следующий шаг roadmap, а не скрытая подмена.
            Уровень Иссык-Куля — реконструкция по публикации, а не сырой Hydroweb.
          </span>
        </div>
      </section>

      {/* limits */}
      <section id="limits" className="mt-16 scroll-mt-24">
        <SectionHeading
          eyebrow="ограничения"
          title={L(locale, "Где метод заканчивается", "Where the method ends")}
          description={L(locale, "Честный инструмент начинается с признания того, чего он не умеет.", "An honest tool starts by admitting what it cannot do.")}
        />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Layers, title: "Грубая сетка в горах", text: "0,25° — это десятки километров. Для небольших объектов используйте MODIS/полевые данные, а не одну ячейку." },
            { icon: Database, title: "Модель ≠ измерение", text: "NASA POWER — реанализ и land surface model. В горах осадки и снег имеют высокую пространственную неопределённость." },
            { icon: Timer, title: "Короткий период", text: "2000–2025 — всего 26 лет. Природные циклы (ENSO, NAO) могут маскировать или усиливать тренд." },
            { icon: ShieldAlert, title: "Реконструкции", text: "Уровень Иссык-Куля собран по опубликованным опорным значениям и темпам. Для официальных выводов нужен Hydroweb/DAHITI." },
            { icon: Info, title: "Регулируемые объекты", text: "Токтогул зависит от режима ГЭС. Климатический тренд там нельзя читать без энергетического контекста." },
            { icon: FlaskConical, title: "FDR снижает мощность", text: "Поправка на множественные сравнения уменьшает число «значимых» результатов. Это цена за меньший риск ложных открытий." },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.title} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                <Icon className="h-4 w-4 text-solar-300" />
                <div className="mt-4 text-[12px] font-semibold text-slate-200">{c.title}</div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">{c.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* faq */}
      <section className="mt-16">
        <SectionHeading eyebrow={L(locale, "вопросы", "questions")} title={L(locale, "Короткие ответы на неудобные вопросы", "Short answers to awkward questions")} />
        <div className="mt-6 max-w-3xl">
          <Accordion
            defaultOpen={0}
            items={[
              {
                title: "Почему у Иссык-Куля нет тренда, если говорят, что он мелеет?",
                content: (
                  <p>
                    За 2000–2025 ряд нелинейный: уровень рос примерно до 2011 года, затем снижался. Mann–Kendall
                    проверяет монотонный тренд за весь период и не находит его. Это не значит, что всё хорошо — это
                    значит, что период надо разбить. Попробуйте 2011–2025 в блоке «Период».
                  </p>
                ),
              },
              {
                title: "Чем q отличается от p?",
                content: (
                  <p>
                    p — для одного теста. q — после поправки на то, что мы сделали много тестов. Если q &gt; 0,05,
                    результат может быть ложным открытием. На карте и в таблице смотрите на оба числа.
                  </p>
                ),
              },
              {
                title: "Можно ли сказать, что потепление вызвало изменение?",
                content: (
                  <p>
                    Нет. Мы показываем согласованность направлений и корреляцию, но не идентифицируем причинный эффект.
                    Для причинного вывода нужен дизайн исследования: контроль, инструменты, эксперимент — не
                    корреляция двух трендов.
                  </p>
                ),
              },
              {
                title: "Почему у ледников нет «массы льда»?",
                content: (
                  <p>
                    Потому что используемые данные этого не измеряют. MODIS видит сезонный снежный покров, а не массу
                    ледника. GRACE даёт слишком грубое разрешение. Мы честно называем прокси прокси.
                  </p>
                ),
              },
              {
                title: "Почему данные начинаются с 2000 года?",
                content: (
                  <p>
                    Это граница analysis-ready куба и доступности согласованных месячных продуктов MERRA-2/GLDAS в
                    текущей сборке. Для более длинных рядов нужны другие источники и отдельная валидация.
                  </p>
                ),
              },
              {
                title: "Как скачать данные и результат?",
                content: (
                  <p>
                    На экране анализа есть кнопка CSV: ряд, годовые значения, метод, p, q, наклон, доверительный
                    интервал, источник и оговорка. Данные принадлежат источникам; цитирование указано в файле.
                  </p>
                ),
              },
            ]}
          />
        </div>
      </section>

      {/* CTA */}
      <div className="mt-14 flex flex-col items-center justify-between gap-4 rounded-2xl border border-aurora-400/15 bg-aurora-400/[0.04] px-6 py-6 sm:flex-row">
        <div>
          <div className="font-display text-lg font-semibold text-slate-100">Теперь проверьте это на данных</div>
          <p className="mt-1 text-[11px] text-slate-400">Выберите объект и период — или спросите AI, где искать сигнал.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/explore" className="btn-primary btn-sm">
            <CheckCircle2 className="h-3.5 w-3.5" /> Исследовать
          </Link>
          <Link href="/" className="btn-secondary btn-sm">
            <BookOpen className="h-3.5 w-3.5" /> На карту
          </Link>
        </div>
      </div>
    </div>
  );
}
