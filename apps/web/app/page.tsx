import { SearchForm } from '@/components/SearchForm';
import { addDays } from '@/lib/format';

export default function Home() {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="pt-[8vh]">
      <h1 className="max-w-3xl text-2xl font-semibold leading-[1.05] tracking-tight sm:text-[3.5rem]">
        Every fare, ranked by how good a deal it really is.
      </h1>
      <p className="mt-4 max-w-xl text-base text-fg-2">
        We compare price, total travel time, stops and connection risk, then show you why each
        result scored the way it did.
      </p>
      <div className="mt-14">
        <SearchForm minDate={today} defaults={{ departDate: addDays(today, 30) }} />
      </div>
      <dl className="mt-24 grid gap-8 border-t border-line pt-8 text-sm sm:grid-cols-3">
        {[
          [
            'Deal Score',
            'Price, duration, stops and schedule in a single number from 0 to 100, with an explanation.',
          ],
          [
            'Unusual fares',
            'Fares far below the typical price for the route are flagged so you can move fast.',
          ],
          [
            'Honest risk',
            'Tight connections, airport changes and separate tickets are always called out.',
          ],
        ].map(([t, d]) => (
          <div key={t}>
            <dt className="font-semibold">{t}</dt>
            <dd className="mt-1 text-fg-2">{d}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
