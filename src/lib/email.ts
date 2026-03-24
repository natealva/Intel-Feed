import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface DigestArticle {
  title: string;
  summary: string | null;
  source_url: string | null;
  topic_name: string;
}

export async function sendDigestEmail(
  to: string,
  articles: DigestArticle[],
  briefing: string
) {
  // Group articles by topic
  const grouped = new Map<string, DigestArticle[]>();
  for (const article of articles) {
    const list = grouped.get(article.topic_name) ?? [];
    list.push(article);
    grouped.set(article.topic_name, list);
  }

  const topicSections = Array.from(grouped.entries())
    .map(
      ([topic, items]) => `
      <tr>
        <td style="padding: 24px 0 8px 0;">
          <span style="display: inline-block; background: #f0f0f0; color: #444; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 100px; text-transform: uppercase; letter-spacing: 0.5px;">
            ${escapeHtml(topic)}
          </span>
        </td>
      </tr>
      ${items
        .map(
          (a) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
          <a href="${escapeHtml(a.source_url ?? "#")}" style="color: #111; font-size: 16px; font-weight: 600; text-decoration: none; line-height: 1.4;">
            ${escapeHtml(a.title)}
          </a>
          ${a.summary ? `<p style="color: #555; font-size: 14px; line-height: 1.6; margin: 6px 0 0 0;">${escapeHtml(a.summary)}</p>` : ""}
        </td>
      </tr>`
        )
        .join("")}`
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #fafafa; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background: #111; padding: 24px 32px;">
              <h1 style="margin: 0; color: #fff; font-size: 20px; font-weight: 700; letter-spacing: -0.3px;">Intel Feed</h1>
              <p style="margin: 4px 0 0 0; color: #999; font-size: 13px;">Your daily intelligence briefing</p>
            </td>
          </tr>

          <!-- Briefing -->
          <tr>
            <td style="padding: 28px 32px 20px 32px;">
              <h2 style="margin: 0 0 12px 0; color: #111; font-size: 16px; font-weight: 700;">Today's Briefing</h2>
              <p style="margin: 0; color: #333; font-size: 15px; line-height: 1.7; background: #f8f8f8; padding: 16px; border-radius: 8px; border-left: 3px solid #111;">
                ${escapeHtml(briefing)}
              </p>
            </td>
          </tr>

          <!-- Articles by topic -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${topicSections}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background: #f8f8f8; border-top: 1px solid #eee;">
              <p style="margin: 0; color: #999; font-size: 12px; text-align: center;">
                Sent by Intel Feed &middot; Manage your topics and subscription at your dashboard
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: "Intel Feed <nalvarez@mba2026.hbs.edu>",
    to,
    subject: `Your Intel Feed Briefing — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
    html,
  });

  return { success: !error, error: error?.message };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
