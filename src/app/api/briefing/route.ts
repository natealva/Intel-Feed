import { NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const user_id = request.nextUrl.searchParams.get("user_id");

  if (!user_id) {
    return Response.json({ error: "user_id is required" }, { status: 400 });
  }

  const { data, error } = await getSupabase()
    .from("briefings")
    .select("id, content, created_at")
    .eq("user_id", user_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return Response.json({ briefing: null });
  }

  return Response.json({ briefing: data });
}
