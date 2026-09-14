import "server-only";

const BG = "#09090b";
const SURFACE = "#131316";
const LINE = "#26262b";
const FG = "#fafafa";
const MUTED = "#a1a1aa";
const ACCENT = "#22d3ee";

/** Escapa texto para uso seguro dentro de HTML. */
export function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function appUrl(): string {
  return process.env.APP_URL || "http://localhost:3000";
}

/** Envolve o conteúdo interno num layout dark responsivo (mobile-first). */
export function emailLayout(opts: { title: string; preview?: string; bodyHtml: string; ctaText?: string; ctaHref?: string }): string {
  const cta =
    opts.ctaText && opts.ctaHref
      ? `<tr><td style="padding:8px 24px 28px;">
           <a href="${esc(opts.ctaHref)}" style="display:inline-block;background:${ACCENT};color:${BG};font-weight:700;text-decoration:none;padding:12px 20px;border-radius:12px;font-size:15px;">${esc(opts.ctaText)}</a>
         </td></tr>`
      : "";

  const preview = opts.preview ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preview)}</div>` : "";

  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.title)}</title></head>
<body style="margin:0;padding:0;background:${BG};color:${FG};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  ${preview}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${SURFACE};border:1px solid ${LINE};border-radius:20px;overflow:hidden;">
        <tr><td style="padding:24px 24px 8px;">
          <div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:${ACCENT};font-weight:700;">Leandro Gym 🏋️</div>
          <h1 style="margin:8px 0 0;font-size:22px;line-height:1.2;color:${FG};">${esc(opts.title)}</h1>
        </td></tr>
        <tr><td style="padding:16px 24px 0;color:${FG};font-size:15px;line-height:1.55;">${opts.bodyHtml}</td></tr>
        ${cta}
        <tr><td style="padding:16px 24px 24px;border-top:1px solid ${LINE};color:${MUTED};font-size:12px;line-height:1.5;">
          Você recebe este e-mail porque ativou os lembretes em <a href="${esc(appUrl())}/perfil" style="color:${ACCENT};">Perfil → Configurações</a>.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export { MUTED, LINE, ACCENT, FG };
