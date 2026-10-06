import type { Offer, SearchQuery } from './schema';

export interface ProviderHealth {
  ok: boolean;
  detail?: string;
}

export interface FareProvider {
  id: string;
  /** Human label shown in the UI ("via Google Flights"). */
  label: string;
  /** Hostnames this provider may call or deep-link to. Enforced by the aggregator. */
  allowedHosts: readonly string[];
  search(query: SearchQuery, signal: AbortSignal): AsyncIterable<Offer>;
  health(): Promise<ProviderHealth>;
}
