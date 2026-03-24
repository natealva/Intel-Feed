import { NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { sendDigestEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { user_id } = await request.json();

    if (!user_id) {
      return Response.json({ error: "user_id is required" }, { status: 400 });
    }

    const supabase = getSupabase();

    // Get user's digest email
    const { data: user } = await supabase
      .from("users")
      .select("digest_email")
      .eq("id", user_id)
      .single();

    if (!user?.digest_email) {
      return Response.json({ error: "No digest email set" }, { status: 400 });
    }

    // Get latest briefing
    const { data: briefing } = await supabase
      .from("briefings")
      .select("content")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Get recent articles with topic names
    const { data: articles } = await supabase
      .from("articles")
      .select("title, summary, source_url, topics(name)")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!articles || articles.length === 0) {
      return Response.json({ error: "No articles to send" }, { status: 400 });
    }

    const emailArticles = (articles as unknown as Array<{
      title: string;
      summary: string | null;
      source_url: string | null;
      topics: { name: string } | null;
    }>).map((a) => ({
      title: a.title,
      summary: a.summary,
      source_url: a.source_url,
      topic_name: a.topics?.name ?? "Unknown",
    }));

    const result = await sendDigestEmail(
      user.digest_email,
      emailArticles,
      briefing?.content ?? "No briefing available for today."
    );

    // Log the email
    await supabase.from("email_logs").insert({
      user_id,
      status: result.success ? "sent" : "failed",
    });

    if (!result.success) {
      return Response.json(
        { error: result.error ?? "Failed to send email" },
        { status: 500 }
      );
    }

    return Response.json({ success: true, sent_to: user.digest_email });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
