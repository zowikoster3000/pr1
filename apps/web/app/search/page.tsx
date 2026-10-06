import { airportByIata, SearchQuerySchema } from '@lowfare/core';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Results } from '@/components/Results';
import { SearchForm } from '@/components/SearchForm';
import { formatDay } from '@/lib/format';

type Params = Promise<Record<string, string | string[] | undefined>>;

function parse(raw: Awaited<Params>) {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const val = Array.isArray(v) ? v[0] : v;
    if (val) flat[k] = val;
  }
  return { flat, result: SearchQuerySchema.safeParse(flat) };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Params;
}): Promise<Metadata> {
  const { result } = parse(await searchParams);
  return {
    title: result.success ? `${result.data.origin} → ${result.data.destination}` : 'Search',
  };
}

export default async function SearchPage({ searchParams }: { searchParams: Params }) {
  const { flat, result } = parse(await searchParams);
  const today = new Date().toISOString().slice(0, 10);

  if (!result.success) {
    return (
      <div className="pt-8">
        <h1 className="text-xl font-semibold tracking-tight">Check your search</h1>
        <ul className="mt-3 list-inside list-disc text-sm text-fg-2">
          {result.error.issues.map((i) => (
            <li key={i.path.join('.') + i.message}>
              {i.path.join('.') || 'search'}: {i.message}
            </li>
          ))}
        </ul>
        <div className="mt-10">
          <SearchForm minDate={today} defaults={flat as never} />
        </div>
      </div>
    );
  }

  const q = result.data;
  const city = (iata: string) => airportByIata(iata)?.city ?? iata;
  return (
    <div className="pt-4">
      <details className="group border-b border-line pb-6">
        <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="text-xl font-semibold tracking-tight">
            {city(q.origin)} → {city(q.destination)}
          </h1>
          <span className="nums text-sm text-fg-2">
            {formatDay(q.departDate)}
            {q.returnDate ? ` – ${formatDay(q.returnDate)}` : ' · one way'} · {q.adults} adult
            {q.adults > 1 ? 's' : ''} · {q.cabin.replace('_', ' ')}
          </span>
          <span className="ml-auto text-xs underline underline-offset-4 group-open:hidden">
            Edit search
          </span>
        </summary>
        <div className="mt-6">
          <SearchForm minDate={today} defaults={q} />
        </div>
      </details>
      <Results key={JSON.stringify(q)} query={q} />
      <p className="mt-10 text-xs text-fg-3">
        <Link href="/" className="underline underline-offset-4">
          New search
        </Link>
      </p>
    </div>
  );
}
