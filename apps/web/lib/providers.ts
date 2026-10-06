import 'server-only';
import { createDemoProvider, createSerpApiProvider, type FareProvider } from '@lowfare/core';

/** Real providers are enabled by their API keys; demo data is used only when none are configured. */
export function configuredProviders(env = process.env): FareProvider[] {
  const real: FareProvider[] = [];
  if (env.SERPAPI_API_KEY) real.push(createSerpApiProvider({ apiKey: env.SERPAPI_API_KEY }));
  if (real.length === 0 || env.LOWFARE_DEMO === '1') return [createDemoProvider()];
  return real;
}
