export default function PodcastDigest() {
  return (
    <div className="text-center py-20">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
        <svg
          className="w-8 h-8 text-zinc-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
        Podcast Digest
      </h2>
      <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
        AI-generated audio summaries of your daily news feed. Coming soon.
      </p>
    </div>
  );
}
