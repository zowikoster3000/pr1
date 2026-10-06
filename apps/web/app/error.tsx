'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="pt-[10vh]">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <button type="button" onClick={reset} className="mt-4 text-sm underline underline-offset-4">
        Try again
      </button>
    </div>
  );
}
