import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { user_id } = await request.json();

    if (!user_id) {
      return Response.json({ error: "user_id is required" }, { status: 400 });
    }

    const supabase = getSupabase();
    const anthropic = new Anthropic();

    // Fetch user's topics
    const { data: topics, error: topicsError } = await supabase
      .from("topics")
      .select("id, name")
      .eq("user_id", user_id);

    if (topicsError) {
      return Response.json({ error: topicsError.message }, { status: 500 });
    }

    if (!topics || topics.length === 0) {
      return Response.json({ error: "No topics found for user" }, { status: 404 });
    }

    const articles: Array<{
      user_id: string;
      topic_id: string;
      title: string;
      summary: string;
      source_url: string;
      published_at: string;
    }> = [];

    // For each topic, call Claude with web search to find recent news
    for (const topic of topics) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: 5,
          },
        ],
        messages: [
          {
            role: "user",
            content: `Find the top 3 news articles about "${topic.name}" from the last 24 hours. For each article, return a JSON array with objects containing: title, summary (2-3 sentences), source_url, and published_at (ISO 8601 date string). Return ONLY the JSON array, no other text.`,
          },
        ],
      });

      // Extract text from the response
      const textBlock = response.content.find((block) => block.type === "text");
      if (!textBlock || textBlock.type !== "text") continue;

      try {
        // Parse the JSON from Claude's response — strip markdown fences if present
        let raw = textBlock.text.trim();
        const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) {
          raw = fenceMatch[1].trim();
        }
        const parsed = JSON.parse(raw) as Array<{
          title: string;
          summary: string;
          source_url: string;
          published_at: string;
        }>;

        for (const item of parsed) {
          articles.push({
            user_id,
            topic_id: topic.id,
            title: item.title,
            summary: item.summary,
            source_url: item.source_url,
            published_at: item.published_at,
          });
        }
      } catch {
        // If Claude's response isn't valid JSON, skip this topic
        console.error(`Failed to parse response for topic: ${topic.name}`);
      }
    }

    // Insert all articles into Supabase
    if (articles.length > 0) {
      const { error: insertError } = await supabase
        .from("articles")
        .insert(articles);

      if (insertError) {
        return Response.json({ error: insertError.message }, { status: 500 });
      }
    }

    return Response.json({
      success: true,
      articles_count: articles.length,
      topics_processed: topics.length,
    });
  } catch (err) {
    console.error("Agent run error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
