import nodemailer from "nodemailer";
import type { NotificationConfig } from "@devteam/shared";

export interface NotificationPayload {
  projectId: string;
  projectName: string;
  agentName: string;
  channelName: string;
  summary: string;
  isFailure: boolean;
}

export async function sendNotification(
  config: NotificationConfig,
  payload: NotificationPayload
): Promise<void> {
  const promises: Promise<void>[] = [];

  if (config.email) {
    promises.push(sendEmailNotification(config.email, payload));
  }
  if (config.slackWebhookUrl) {
    promises.push(sendSlackNotification(config.slackWebhookUrl, payload));
  }

  await Promise.allSettled(promises);
}

async function sendEmailNotification(
  to: string,
  payload: NotificationPayload
): Promise<void> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT ?? "587", 10),
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const subject = payload.isFailure
    ? `[Shipmate] ⚠️ ${payload.agentName} reported a failure`
    : `[Shipmate] ✅ ${payload.agentName} completed a task`;

  await transporter.sendMail({
    from: SMTP_FROM ?? "Shipmate <noreply@devteam.ai>",
    to,
    subject,
    text: `${payload.summary}\n\nProject: ${payload.projectName}\nChannel: #${payload.channelName}`,
    html: `<p>${payload.summary}</p><p><strong>Project:</strong> ${payload.projectName}<br><strong>Channel:</strong> #${payload.channelName}</p>`,
  });
}

async function sendSlackNotification(
  webhookUrl: string,
  payload: NotificationPayload
): Promise<void> {
  const icon = payload.isFailure ? "⚠️" : "✅";
  const text = `${icon} *${payload.agentName}* — ${payload.summary}\n*Project:* ${payload.projectName} | *Channel:* #${payload.channelName}`;

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}
