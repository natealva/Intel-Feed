"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

interface Article {
  id: string;
  title: string;
  summary: string | null;
  source_url: string | null;
  published_at: string | null;
  created_at: string;
  topics: { name: string }[] | null;
}

export default function MyFeed() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchArticles() {
      const { data, error } = await getSupabase()
        .from("articles")
        .select("id, title, summary, source_url, published_at, created_at, topics(name)")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        setArticles(data as Article[]);
      }
      setLoading(false);
    }

    fetchArticles();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-zinc-100" />
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
          No articles yet
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400">
          Add topics and run the agent to populate your feed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {articles.map((article) => (
        <article
          key={article.id}
          className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {article.topics?.[0]?.name && (
                  <span className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {article.topics[0].name}
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
  );
}
