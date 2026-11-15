import { getMeta, getPhenomena } from "@/lib/catalog";
import { buildPhenomenonMap } from "@/lib/phenomena";
import { HomeContent } from "@/components/home/HomeContent";

export const revalidate = 3600;

export default function HomePage() {
  const meta = getMeta();
  const phenomena = getPhenomena();
  const initialMap = buildPhenomenonMap("global-warming", meta.period.from, meta.period.to);

  if (!initialMap) {
    return (
      <div className="section py-24 text-center text-slate-400">
        Данные ещё не собраны. Запустите <code className="text-aurora-300">python3 etl/fetch_data.py</code>.
      </div>
    );
  }

  return <HomeContent meta={meta} initialMap={initialMap} phenomena={phenomena} />;
}
