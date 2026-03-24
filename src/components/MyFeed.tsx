"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

const USER_ID = "11111111-1111-1111-1111-111111111111";

interface Topic {
  id: string;
  name: string;
}

interface Article {
  id: string;
  title: string;
  summary: string | null;
  source_url: string | null;
  published_at: string | null;
  created_at: string;
  topics: { name: string } | null;
}

interface Briefing {
  id: string;
  content: string;
  created_at: string;
}

export default function MyFeed() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [newTopic, setNewTopic] = useState("");
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Email subscription state
  const [digestEmail, setDigestEmail] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  useEffect(() => {
    fetchTopics();
    fetchArticles();
    fetchBriefing();
    fetchSubscription();
  }, []);

  async function fetchTopics() {
    const { data } = await getSupabase()
      .from("topics")
      .select("id, name")
      .eq("user_id", USER_ID)
      .order("created_at", { ascending: true });

    if (data) setTopics(data);
  }

  async function fetchArticles() {
    const { data } = await getSupabase()
      .from("articles")
      .select("id, title, summary, source_url, published_at, created_at, topics(name)")
      .eq("user_id", USER_ID)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) setArticles(data as unknown as Article[]);
    setLoading(false);
  }

  async function fetchBriefing() {
    const res = await fetch(`/api/briefing?user_id=${USER_ID}`);
    if (res.ok) {
      const { briefing: b } = await res.json();
      if (b) setBriefing(b);
    }
  }

  async function fetchSubscription() {
    const res = await fetch(`/api/subscribe?user_id=${USER_ID}`);
    if (res.ok) {
      const { digest_email } = await res.json();
      setDigestEmail(digest_email);
    }
  }

  async function addTopic() {
    const name = newTopic.trim();
    if (!name) return;

    setAdding(true);
    const { data, error } = await getSupabase()
      .from("topics")
      .insert({ user_id: USER_ID, name })
      .select("id, name")
      .single();

    if (!error && data) {
      setTopics((prev) => [...prev, data]);
      setNewTopic("");
    }
    setAdding(false);
  }

  async function removeTopic(id: string) {
    const { error } = await getSupabase()
      .from("topics")
      .delete()
      .eq("id", id);

    if (!error) {
      setTopics((prev) => prev.filter((t) => t.id !== id));
      setArticles((prev) => prev.filter((a) => {
        const articleTopicName = a.topics?.name;
        const removedTopic = topics.find((t) => t.id === id);
        return articleTopicName !== removedTopic?.name;
      }));
    }
  }

  async function refreshFeed() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: USER_ID }),
      });
      if (res.ok) {
        await Promise.all([fetchArticles(), fetchBriefing()]);
      }
    } finally {
      setRefreshing(false);
    }
  }

  async function saveEmail() {
    const email = emailInput.trim();
    if (!email) return;

    setSavingEmail(true);
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: USER_ID, digest_email: email }),
    });
    if (res.ok) {
      setDigestEmail(email);
      setEmailInput("");
    }
    setSavingEmail(false);
  }

  async function unsubscribe() {
    setSavingEmail(true);
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: USER_ID, digest_email: null }),
    });
    if (res.ok) {
      setDigestEmail(null);
    }
    setSavingEmail(false);
  }

  return (
    <div className="space-y-6">
      {/* Topic management */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Your Topics
          </h2>
          <button
            onClick={refreshFeed}
            disabled={refreshing || topics.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-zinc-50 px-3 py-1.5 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {refreshing ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-zinc-900/30 dark:border-t-zinc-900" />
                Fetching news...
              </>
            ) : (
              "Refresh Feed"
            )}
          </button>
        </div>

        {topics.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {topics.map((topic) => (
              <span
                key={topic.id}
                className="inline-flex items-center gap-1 rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-sm text-zinc-700 dark:text-zinc-300"
              >
                {topic.name}
                <button
                  onClick={() => removeTopic(topic.id)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  aria-label={`Remove ${topic.name}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            addTopic();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            placeholder="e.g. Quantum computing"
            className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
          />
          <button
            type="submit"
            disabled={adding || !newTopic.trim()}
            className="rounded-lg bg-zinc-900 dark:bg-zinc-50 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {adding ? "Adding..." : "Add"}
          </button>
        </form>
      </section>

      {/* Email subscription */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
          Daily Email Digest
        </h2>
        {digestEmail ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Sending daily digest to{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-50">{digestEmail}</span>
            </p>
            <button
              onClick={unsubscribe}
              disabled={savingEmail}
              className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium disabled:opacity-50 transition-colors"
            >
              {savingEmail ? "Saving..." : "Unsubscribe"}
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveEmail();
            }}
            className="flex gap-2"
          >
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="you@example.com"
              className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
            />
            <button
              type="submit"
              disabled={savingEmail || !emailInput.trim()}
              className="rounded-lg bg-zinc-900 dark:bg-zinc-50 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {savingEmail ? "Saving..." : "Subscribe"}
            </button>
          </form>
        )}
      </section>

      {/* Today's Briefing */}
      {briefing && (
        <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
            Today&apos;s Briefing
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {briefing.content}
          </p>
          <p className="mt-2 text-xs text-zinc-400">
            {new Date(briefing.created_at).toLocaleString()}
          </p>
        </section>
      )}

      {/* Articles feed */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-zinc-100" />
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-20">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
            No articles yet
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400">
            Add topics and run the agent to populate your feed.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => (
            <article
              key={article.id}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {article.topics?.name && (
                      <span className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        {article.topics.name}
                      </span>
                    )}
                    {article.published_at && (
                      <span className="text-xs text-zinc-400">
                        {new Date(article.published_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    {article.source_url ? (
                      <a
                        href={article.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {article.title}
                      </a>
                    ) : (
                      article.title
                    )}
                  </h3>
                  {article.summary && (
                    <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3">
                      {article.summary}
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
