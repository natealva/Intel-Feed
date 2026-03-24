import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const errors: Array<{ topic?: string; stage: string; message: string }> = [];

  try {
    const body = await request.json().catch((e) => {
      throw new Error(`Failed to parse request body: ${e.message}`);
    });

    const { user_id } = body;

    if (!user_id) {
      return Response.json({ error: "user_id is required" }, { status: 400 });
    }

    // Verify env vars
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        { error: "ANTHROPIC_API_KEY is not set" },
        { status: 500 }
      );
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return Response.json(
        { error: "Supabase env vars are not set" },
        { status: 500 }
      );
    }

    const supabase = getSupabase();
    const anthropic = new Anthropic();

    // Fetch user's topics
    const { data: topics, error: topicsError } = await supabase
      .from("topics")
      .select("id, name")
      .eq("user_id", user_id);

    if (topicsError) {
      return Response.json(
        { error: "Supabase topics query failed", details: topicsError.message },
        { status: 500 }
      );
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
      try {
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
        if (!textBlock || textBlock.type !== "text") {
          errors.push({
            topic: topic.name,
            stage: "anthropic_response",
            message: `No text block in response. Content types: ${response.content.map((b) => b.type).join(", ")}`,
          });
          continue;
        }

        // Parse the JSON from Claude's response — strip markdown fences if present
        let raw = textBlock.text.trim();
        const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) {
          raw = fenceMatch[1].trim();
        }

        let parsed: Array<{
          title: string;
          summary: string;
          source_url: string;
          published_at: string;
        }>;

        try {
          parsed = JSON.parse(raw);
        } catch {
          errors.push({
            topic: topic.name,
            stage: "json_parse",
            message: `Failed to parse JSON. Raw response (first 500 chars): ${raw.slice(0, 500)}`,
          });
          continue;
        }

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
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const apiError = err as { status?: number; error?: { type?: string; message?: string } };
        errors.push({
          topic: topic.name,
          stage: "anthropic_call",
          message: apiError.error?.message || message,
          ...(apiError.status ? { status: apiError.status } : {}),
          ...(apiError.error?.type ? { type: apiError.error.type } : {}),
        } as typeof errors[number]);
      }
    }

    // Insert all articles into Supabase
    if (articles.length > 0) {
      const { error: insertError } = await supabase
        .from("articles")
        .insert(articles);

      if (insertError) {
        return Response.json(
          { error: "Supabase insert failed", details: insertError.message },
          { status: 500 }
        );
      }
    }

    return Response.json({
      success: true,
      articles_count: articles.length,
      topics_processed: topics.length,
      ...(errors.length > 0 ? { errors } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Agent run error:", message);
    return Response.json(
      { error: message, errors },
      { status: 500 }
    );
  }
}
