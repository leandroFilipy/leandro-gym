import { ImageResponse } from "next/og";

// Ícones PNG do app gerados em runtime (sem arquivos binários no repo).
const SIZES = new Set([180, 192, 512]);

export async function GET(_req: Request, ctx: RouteContext<"/icons/[size]">) {
  const { size: raw } = await ctx.params;
  const size = SIZES.has(Number(raw)) ? Number(raw) : 192;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#09090b",
        }}
      >
        <div
          style={{
            width: "72%",
            height: "72%",
            borderRadius: "22%",
            background: "#c6f432",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#0b0f00",
            fontSize: size * 0.36,
            fontWeight: 800,
            letterSpacing: -size * 0.01,
          }}
        >
          LG
        </div>
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=604800, immutable" } },
  );
}
