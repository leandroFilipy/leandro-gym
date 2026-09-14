import "server-only";

/** Um e-mail pronto para envio. */
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/** Abstração de envio de e-mail (fase 2). Implementações: Resend e console (dev). */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

/** Envia via API HTTP do Resend (sem SDK — só `fetch`). */
class ResendSender implements EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: EmailMessage): Promise<void> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        ...(message.text ? { text: message.text } : {}),
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Resend respondeu ${res.status}: ${detail}`);
    }
  }
}

/** Fallback de desenvolvimento: apenas registra no console. */
class ConsoleSender implements EmailSender {
  async send(message: EmailMessage): Promise<void> {
    console.info(`[email] para ${message.to} — ${message.subject}\n${message.text ?? message.html}`);
  }
}

/**
 * Devolve o sender configurado. Usa Resend se `RESEND_API_KEY` e `EMAIL_FROM`
 * estiverem definidos; caso contrário cai no console (dev / e-mail desativado).
 */
export function getEmailSender(): EmailSender {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (apiKey && from) return new ResendSender(apiKey, from);
  return new ConsoleSender();
}

/** True quando o envio real está configurado (Resend). */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}
