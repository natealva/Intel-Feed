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

    console.log(`[agent/run] user_id=${user_id}, topics_found=${topics.length}, topic_names=${topics.map((t) => t.name).join(", ")}`);

    const articles: Array<{
      user_id: string;
      topic_id: string;
      title: string;
      summary: string;
      source_url: string;
      published_at: string;
    }> = [];

    const debug: Array<Record<string, unknown>> = [];

    // For each topic, call Claude with web search to find recent news
    for (const topic of topics) {
      const startTime = Date.now();
      try {
        console.log(`[agent/run] Calling Claude for topic: "${topic.name}"`);

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

        const elapsed = Date.now() - startTime;
        const contentTypes = response.content.map((b) => b.type);

        console.log(`[agent/run] Claude response for "${topic.name}": stop_reason=${response.stop_reason}, content_types=[${contentTypes.join(", ")}], elapsed=${elapsed}ms, usage=${JSON.stringify(response.usage)}`);

        // Log full response content for debugging
        const debugEntry: Record<string, unknown> = {
          topic: topic.name,
          elapsed_ms: elapsed,
          stop_reason: response.stop_reason,
          content_types: contentTypes,
          usage: response.usage,
          content_blocks: response.content.map((block) => {
            if (block.type === "text") return { type: "text", text: block.text.slice(0, 500) };
            if (block.type === "web_search_tool_result") return { type: "web_search_tool_result", content: JSON.stringify(block).slice(0, 500) };
            return { type: block.type };
          }),
        };
        debug.push(debugEntry);
        console.log(`[agent/run] Full response for "${topic.name}":`, JSON.stringify(debugEntry));

        // Extract text from the response
        const textBlock = response.content.find((block) => block.type === "text");
        if (!textBlock || textBlock.type !== "text") {
          errors.push({
            topic: topic.name,
            stage: "anthropic_response",
            message: `No text block in response. Content types: ${contentTypes.join(", ")}, stop_reason: ${response.stop_reason}`,
          });
          continue;
        }

        // Parse the JSON from Claude's response — strip markdown fences if present
        let raw = textBlock.text.trim();
        console.log(`[agent/run] Raw text for "${topic.name}" (first 300 chars): ${raw.slice(0, 300)}`);

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

        console.log(`[agent/run] Parsed ${parsed.length} articles for "${topic.name}"`);

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
        const elapsed = Date.now() - startTime;
        const message = err instanceof Error ? err.message : String(err);
        const apiError = err as { status?: number; error?: { type?: string; message?: string } };
        console.error(`[agent/run] Claude API error for "${topic.name}" (${elapsed}ms):`, message, JSON.stringify(apiError.error));
        errors.push({
          topic: topic.name,
          stage: "anthropic_call",
          message: apiError.error?.message || message,
          ...(apiError.status ? { status: apiError.status } : {}),
          ...(apiError.error?.type ? { type: apiError.error.type } : {}),
        } as typeof errors[number]);
      }
    }

    console.log(`[agent/run] Total articles to insert: ${articles.length}`);

    // Insert all articles into Supabase
    if (articles.length > 0) {
      const { error: insertError } = await supabase
        .from("articles")
        .insert(articles);

      if (insertError) {
        console.error(`[agent/run] Supabase insert failed:`, insertError.message);
        return Response.json(
          { error: "Supabase insert failed", details: insertError.message, debug },
          { status: 500 }
        );
      }
      console.log(`[agent/run] Inserted ${articles.length} articles successfully`);
    }

    return Response.json({
      success: true,
      articles_count: articles.length,
      topics_processed: topics.length,
      ...(errors.length > 0 ? { errors } : {}),
      debug,
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
