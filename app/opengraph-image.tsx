import { ImageResponse } from "next/og";

export const alt = "K2 — Earth System Trend Detective";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #04070d 0%, #07141c 55%, #0a1a24 100%)",
          padding: "64px 72px",
          color: "#e6edf7",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -120,
            top: -140,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background: "radial-gradient(circle, rgba(46,230,200,0.20), rgba(46,230,200,0) 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -80,
            bottom: -160,
            width: 480,
            height: 480,
            borderRadius: 9999,
            background: "radial-gradient(circle, rgba(167,139,250,0.14), rgba(167,139,250,0) 70%)",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              border: "2px solid #2ee6c8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#2ee6c8",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            T
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 22, letterSpacing: 6, fontWeight: 700 }}>K2</div>
            <div style={{ fontSize: 11, letterSpacing: 4, color: "#64748b" }}>EARTH SYSTEM TREND DETECTIVE</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 16, letterSpacing: 4, color: "#2ee6c8" }}>NASA SPACE APPS 2026 · КЫРГЫЗСТАН</div>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, display: "flex", flexDirection: "column" }}>
            Климат Кыргызстана.
            <span style={{ color: "#6cf7de" }}>Без догадок.</span>
          </div>
          <div style={{ fontSize: 22, color: "#94a3b8", maxWidth: 820, lineHeight: 1.45 }}>
            Спутниковые и климатические данные в одном кубе. Тренды, значимость, FDR-поправка и AI-детектив.
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, fontSize: 14, color: "#94a3b8" }}>
          {["20 объектов", "10 переменных", "2000–2025", "4 источника"].map((t) => (
            <div
              key={t}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
