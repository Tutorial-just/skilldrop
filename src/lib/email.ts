import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM ?? "SkillDrop <onboarding@resend.dev>";

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailInput) {
  if (!resend) {
    console.warn("RESEND_API_KEY is missing. Email skipped:", {
      to,
      subject,
    });

    return {
      ok: false,
      skipped: true,
      reason: "RESEND_API_KEY is missing.",
    };
  }

  try {
    const result = await resend.emails.send({
      from: emailFrom,
      to,
      subject,
      html,
      text,
    });

    return {
      ok: true,
      skipped: false,
      id: result.data?.id ?? null,
    };
  } catch (error) {
    console.error("Failed to send email:", error);

    return {
      ok: false,
      skipped: false,
      reason: "Failed to send email.",
    };
  }
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function buildEmailLayout({
  title,
  preview,
  body,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  preview: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  const safeTitle = escapeHtml(title);
  const safePreview = escapeHtml(preview);

  const cta =
    ctaLabel && ctaHref
      ? `
        <p style="margin: 28px 0;">
          <a href="${ctaHref}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:14px;">
            ${escapeHtml(ctaLabel)}
          </a>
        </p>
      `
      : "";

  return `
    <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">
      ${safePreview}
    </div>

    <main style="font-family:Inter,Arial,sans-serif;background:#fbf8ff;padding:32px;">
      <section style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid rgba(109,40,217,.14);border-radius:24px;padding:32px;">
        <p style="margin:0 0 18px;font-size:13px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#7c3aed;">
          SkillDrop
        </p>

        <h1 style="margin:0;font-size:28px;line-height:1.15;color:#221833;">
          ${safeTitle}
        </h1>

        <div style="margin-top:20px;font-size:15px;line-height:1.7;color:#615675;">
          ${body}
        </div>

        ${cta}

        <hr style="border:none;border-top:1px solid rgba(109,40,217,.14);margin:28px 0;" />

        <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
          You received this email because you use SkillDrop.
        </p>
      </section>
    </main>
  `;
}