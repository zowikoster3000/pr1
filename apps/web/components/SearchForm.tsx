import type { SearchQuery } from '@lowfare/core';
import { AirportInput } from './AirportInput';

const field =
  'w-full border-0 border-b border-line bg-transparent py-2 text-lg font-semibold tracking-tight outline-none focus:border-fg';

/** Plain GET form: works without JavaScript, shareable URLs, back button just works. */
export function SearchForm({
  defaults,
  minDate,
}: {
  defaults: Partial<SearchQuery>;
  minDate: string;
}) {
  return (
    <form action="/search" method="get" role="search" aria-label="Flight search">
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_0.8fr_0.8fr]">
        <AirportInput
          name="origin"
          label="From"
          defaultIata={defaults.origin}
          placeholder="City or airport"
        />
        <AirportInput
          name="destination"
          label="To"
          defaultIata={defaults.destination}
          placeholder="City or airport"
        />
        <div>
          <label htmlFor="departDate" className="block text-xs text-fg-3">
            Depart
          </label>
          <input
            id="departDate"
            name="departDate"
            type="date"
            required
            min={minDate}
            defaultValue={defaults.departDate}
            className={`${field} nums`}
          />
        </div>
        <div>
          <label htmlFor="returnDate" className="block text-xs text-fg-3">
            Return (optional)
          </label>
          <input
            id="returnDate"
            name="returnDate"
            type="date"
            min={minDate}
            defaultValue={defaults.returnDate}
            className={`${field} nums`}
          />
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-4">
        <div>
          <label htmlFor="adults" className="block text-xs text-fg-3">
            Travellers
          </label>
          <select
            id="adults"
            name="adults"
            defaultValue={String(defaults.adults ?? 1)}
            className="border-0 border-b border-line bg-transparent py-2 pr-6 text-base outline-none focus:border-fg"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <option key={n} value={n}>
                {n} adult{n > 1 ? 's' : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="cabin" className="block text-xs text-fg-3">
            Cabin
          </label>
          <select
            id="cabin"
            name="cabin"
            defaultValue={defaults.cabin ?? 'economy'}
            className="border-0 border-b border-line bg-transparent py-2 pr-6 text-base outline-none focus:border-fg"
          >
            <option value="economy">Economy</option>
            <option value="premium_economy">Premium economy</option>
            <option value="business">Business</option>
            <option value="first">First</option>
          </select>
        </div>
        <button
          type="submit"
          className="ml-auto h-12 w-full bg-fg px-8 text-sm font-semibold tracking-wide text-bg transition-opacity hover:opacity-85 sm:w-auto"
        >
          Search flights
        </button>
      </div>
    </form>
  );
}
