import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="pt-[10vh]">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <Link href="/" className="mt-4 inline-block text-sm underline underline-offset-4">
        Back to search
      </Link>
    </div>
  );
}
