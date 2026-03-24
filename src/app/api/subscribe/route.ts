import { NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const user_id = request.nextUrl.searchParams.get("user_id");

  if (!user_id) {
    return Response.json({ error: "user_id is required" }, { status: 400 });
  }

  const { data, error } = await getSupabase()
    .from("users")
    .select("digest_email")
    .eq("id", user_id)
    .single();

  if (error || !data) {
    return Response.json({ digest_email: null });
  }

  return Response.json({ digest_email: data.digest_email });
}

export async function POST(request: NextRequest) {
  const { user_id, digest_email } = await request.json();

  if (!user_id) {
    return Response.json({ error: "user_id is required" }, { status: 400 });
  }

  const { error } = await getSupabase()
    .from("users")
    .update({ digest_email: digest_email || null })
    .eq("id", user_id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true, digest_email: digest_email || null });
}
