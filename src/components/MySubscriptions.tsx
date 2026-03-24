"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

const USER_ID = "11111111-1111-1111-1111-111111111111";

interface Topic {
  id: string;
  name: string;
}

interface Briefing {
  id: string;
  content: string;
  created_at: string;
}

export default function MySubscriptions() {
  const [digestEmail, setDigestEmail] = useState<string | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [unsubscribing, setUnsubscribing] = useState(false);

  useEffect(() => {
    Promise.all([fetchSubscription(), fetchTopics(), fetchBriefing()]).then(
      () => setLoading(false)
    );
  }, []);

  async function fetchSubscription() {
    const res = await fetch(`/api/subscribe?user_id=${USER_ID}`);
    if (res.ok) {
      const { digest_email } = await res.json();
      setDigestEmail(digest_email);
    }
  }

  async function fetchTopics() {
    const { data } = await getSupabase()
      .from("topics")
      .select("id, name")
      .eq("user_id", USER_ID)
      .order("created_at", { ascending: true });

    if (data) setTopics(data);
  }

  async function fetchBriefing() {
    const res = await fetch(`/api/briefing?user_id=${USER_ID}`);
    if (res.ok) {
      const { briefing: b } = await res.json();
      if (b) setBriefing(b);
    }
  }

  async function removeTopic(id: string) {
    const { error } = await getSupabase()
      .from("topics")
      .delete()
      .eq("id", id);

    if (!error) {
      setTopics((prev) => prev.filter((t) => t.id !== id));
    }
  }

  async function unsubscribeAll() {
    setUnsubscribing(true);
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: USER_ID, digest_email: null }),
    });
    if (res.ok) {
      setDigestEmail(null);
    }
    setUnsubscribing(false);
  }

  function formatSendTime() {
    // Convert 8:00 UTC to local time
    const utcDate = new Date();
    utcDate.setUTCHours(8, 0, 0, 0);
    return utcDate.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-zinc-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Subscription status */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
          Email Subscription
        </h2>

        {digestEmail ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Active — sending to{" "}
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {digestEmail}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Daily at {formatSendTime()}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Not subscribed — set your email in the My Feed tab to start receiving daily digests.
            </p>
          </div>
        )}
      </section>

      {/* Active topics */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
          Active Topics ({topics.length})
        </h2>

        {topics.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No topics yet. Add topics in the My Feed tab to start tracking news.
          </p>
        ) : (
          <div className="space-y-2">
            {topics.map((topic) => (
              <div
                key={topic.id}
                className="flex items-center justify-between rounded-lg bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2.5"
              >
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  {topic.name}
                </span>
                <button
                  onClick={() => removeTopic(topic.id)}
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Briefing preview */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
          Latest Briefing Preview
        </h2>

        {briefing ? (
          <div>
            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-4 border-l-3 border-zinc-900 dark:border-zinc-100">
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {briefing.content}
              </p>
            </div>
            <p className="mt-2 text-xs text-zinc-400">
              Generated {new Date(briefing.created_at).toLocaleString()}
            </p>
          </div>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No briefing yet. Hit &quot;Refresh Feed&quot; in the My Feed tab to generate one.
          </p>
        )}
      </section>

      {/* Unsubscribe from all */}
      {digestEmail && (
        <section className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-red-900 dark:text-red-200">
                Unsubscribe from all
              </h2>
              <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">
                This will clear your email and stop all daily digest emails.
              </p>
            </div>
            <button
              onClick={unsubscribeAll}
              disabled={unsubscribing}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {unsubscribing ? "Unsubscribing..." : "Unsubscribe"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
