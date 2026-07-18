import { Resend } from "resend";

export function createResendClient(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("[FlowDesk Emails] Missing RESEND_API_KEY");
  return new Resend(key);
}

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "support@flowdesk.app";
export const FROM_NAME = process.env.RESEND_FROM_NAME ?? "FlowDesk";
