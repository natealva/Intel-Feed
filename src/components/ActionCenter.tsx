export default function ActionCenter() {
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
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
        Action Center
      </h2>
      <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
        Manage topics, trigger agent runs, and view email delivery logs. Coming soon.
      </p>
    </div>
  );
}
