"use client";

import { useState } from "react";
import MyFeed from "@/components/MyFeed";
import PodcastDigest from "@/components/PodcastDigest";
import ActionCenter from "@/components/ActionCenter";

const tabs = ["My Feed", "Podcast Digest", "Action Center"] as const;
type Tab = (typeof tabs)[number];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("My Feed");

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Intel Feed
          </h1>
        </div>
      </header>

      <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-5xl mx-auto px-4 flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab
                  ? "text-zinc-900 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 dark:bg-zinc-50" />
              )}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {activeTab === "My Feed" && <MyFeed />}
        {activeTab === "Podcast Digest" && <PodcastDigest />}
        {activeTab === "Action Center" && <ActionCenter />}
      </main>
    </div>
  );
}
