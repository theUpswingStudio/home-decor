import { ImageResponse } from "next/og";
import { catalog } from "@/lib/catalog";

export const alt = `${catalog.site.brandName} — ${catalog.site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background: "#f4f0e8",
          color: "#1f211d",
          display: "flex",
          height: "100%",
          padding: "58px",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            border: "2px solid #1f211d",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "48px 54px",
            width: "100%",
          }}
        >
          <div
            style={{
              alignItems: "center",
              display: "flex",
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            VESTREL <span style={{ color: "#8a3d2f", margin: "0 14px" }}>/</span> HOUSE
          </div>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 850 }}>
            <div style={{ color: "#8a3d2f", fontSize: 22, letterSpacing: "0.12em", marginBottom: 20, textTransform: "uppercase" }}>
              Collected modernism
            </div>
            <div style={{ fontFamily: "serif", fontSize: 86, letterSpacing: "-0.045em", lineHeight: 0.96 }}>
              {catalog.site.tagline}
            </div>
          </div>
          <div style={{ alignItems: "center", display: "flex", fontSize: 22, justifyContent: "space-between" }}>
            <span>Furniture-led interiors</span>
            <span style={{ color: "#615e56" }}>United States / Canada</span>
          </div>
        </div>
        <div style={{ background: "#8a3d2f", height: 12, position: "absolute", right: 58, top: 58, width: 210 }} />
      </div>
    ),
    size,
  );
}
