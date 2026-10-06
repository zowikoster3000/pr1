/**
 * Curated starter set of major airports. Replace with a full dataset (e.g. OurAirports,
 * public domain) when nearby-airport search lands in Phase 2.
 */
export interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  tz: string;
}

// prettier-ignore
const RAW: [string, string, string, string, number, number, string][] = [
  ['AMS', 'Schiphol', 'Amsterdam', 'NL', 52.31, 4.76, 'Europe/Amsterdam'],
  ['EIN', 'Eindhoven', 'Eindhoven', 'NL', 51.45, 5.37, 'Europe/Amsterdam'],
  ['RTM', 'Rotterdam The Hague', 'Rotterdam', 'NL', 51.96, 4.44, 'Europe/Amsterdam'],
  ['BRU', 'Brussels', 'Brussels', 'BE', 50.90, 4.48, 'Europe/Brussels'],
  ['CRL', 'Charleroi', 'Brussels', 'BE', 50.46, 4.45, 'Europe/Brussels'],
  ['DUS', 'Düsseldorf', 'Düsseldorf', 'DE', 51.29, 6.77, 'Europe/Berlin'],
  ['CGN', 'Cologne Bonn', 'Cologne', 'DE', 50.87, 7.14, 'Europe/Berlin'],
  ['FRA', 'Frankfurt', 'Frankfurt', 'DE', 50.04, 8.56, 'Europe/Berlin'],
  ['MUC', 'Munich', 'Munich', 'DE', 48.35, 11.79, 'Europe/Berlin'],
  ['BER', 'Berlin Brandenburg', 'Berlin', 'DE', 52.37, 13.50, 'Europe/Berlin'],
  ['HAM', 'Hamburg', 'Hamburg', 'DE', 53.63, 9.99, 'Europe/Berlin'],
  ['LHR', 'Heathrow', 'London', 'GB', 51.47, -0.45, 'Europe/London'],
  ['LGW', 'Gatwick', 'London', 'GB', 51.15, -0.19, 'Europe/London'],
  ['STN', 'Stansted', 'London', 'GB', 51.89, 0.24, 'Europe/London'],
  ['MAN', 'Manchester', 'Manchester', 'GB', 53.35, -2.27, 'Europe/London'],
  ['EDI', 'Edinburgh', 'Edinburgh', 'GB', 55.95, -3.37, 'Europe/London'],
  ['DUB', 'Dublin', 'Dublin', 'IE', 53.43, -6.25, 'Europe/Dublin'],
  ['CDG', 'Charles de Gaulle', 'Paris', 'FR', 49.01, 2.55, 'Europe/Paris'],
  ['ORY', 'Orly', 'Paris', 'FR', 48.72, 2.38, 'Europe/Paris'],
  ['NCE', 'Nice Côte d’Azur', 'Nice', 'FR', 43.66, 7.21, 'Europe/Paris'],
  ['LYS', 'Lyon Saint-Exupéry', 'Lyon', 'FR', 45.73, 5.08, 'Europe/Paris'],
  ['MAD', 'Barajas', 'Madrid', 'ES', 40.47, -3.56, 'Europe/Madrid'],
  ['BCN', 'El Prat', 'Barcelona', 'ES', 41.30, 2.08, 'Europe/Madrid'],
  ['AGP', 'Málaga', 'Málaga', 'ES', 36.67, -4.50, 'Europe/Madrid'],
  ['PMI', 'Palma de Mallorca', 'Palma', 'ES', 39.55, 2.74, 'Europe/Madrid'],
  ['LIS', 'Humberto Delgado', 'Lisbon', 'PT', 38.77, -9.13, 'Europe/Lisbon'],
  ['OPO', 'Francisco Sá Carneiro', 'Porto', 'PT', 41.24, -8.68, 'Europe/Lisbon'],
  ['FCO', 'Fiumicino', 'Rome', 'IT', 41.80, 12.25, 'Europe/Rome'],
  ['MXP', 'Malpensa', 'Milan', 'IT', 45.63, 8.72, 'Europe/Rome'],
  ['VCE', 'Marco Polo', 'Venice', 'IT', 45.51, 12.35, 'Europe/Rome'],
  ['NAP', 'Naples', 'Naples', 'IT', 40.89, 14.29, 'Europe/Rome'],
  ['ZRH', 'Zurich', 'Zurich', 'CH', 47.46, 8.55, 'Europe/Zurich'],
  ['GVA', 'Geneva', 'Geneva', 'CH', 46.24, 6.11, 'Europe/Zurich'],
  ['VIE', 'Vienna', 'Vienna', 'AT', 48.11, 16.57, 'Europe/Vienna'],
  ['PRG', 'Václav Havel', 'Prague', 'CZ', 50.10, 14.26, 'Europe/Prague'],
  ['BUD', 'Budapest', 'Budapest', 'HU', 47.44, 19.26, 'Europe/Budapest'],
  ['WAW', 'Chopin', 'Warsaw', 'PL', 52.17, 20.97, 'Europe/Warsaw'],
  ['KRK', 'Kraków', 'Kraków', 'PL', 50.08, 19.78, 'Europe/Warsaw'],
  ['CPH', 'Copenhagen', 'Copenhagen', 'DK', 55.62, 12.66, 'Europe/Copenhagen'],
  ['OSL', 'Gardermoen', 'Oslo', 'NO', 60.19, 11.10, 'Europe/Oslo'],
  ['ARN', 'Arlanda', 'Stockholm', 'SE', 59.65, 17.92, 'Europe/Stockholm'],
  ['HEL', 'Helsinki', 'Helsinki', 'FI', 60.32, 24.96, 'Europe/Helsinki'],
  ['KEF', 'Keflavík', 'Reykjavík', 'IS', 63.99, -22.62, 'Atlantic/Reykjavik'],
  ['ATH', 'Athens', 'Athens', 'GR', 37.94, 23.94, 'Europe/Athens'],
  ['IST', 'Istanbul', 'Istanbul', 'TR', 41.26, 28.74, 'Europe/Istanbul'],
  ['DXB', 'Dubai', 'Dubai', 'AE', 25.25, 55.36, 'Asia/Dubai'],
  ['DOH', 'Hamad', 'Doha', 'QA', 25.27, 51.61, 'Asia/Qatar'],
  ['CAI', 'Cairo', 'Cairo', 'EG', 30.12, 31.41, 'Africa/Cairo'],
  ['RAK', 'Menara', 'Marrakesh', 'MA', 31.61, -8.04, 'Africa/Casablanca'],
  ['JNB', 'O. R. Tambo', 'Johannesburg', 'ZA', -26.14, 28.24, 'Africa/Johannesburg'],
  ['CPT', 'Cape Town', 'Cape Town', 'ZA', -33.97, 18.60, 'Africa/Johannesburg'],
  ['NBO', 'Jomo Kenyatta', 'Nairobi', 'KE', -1.32, 36.93, 'Africa/Nairobi'],
  ['JFK', 'John F. Kennedy', 'New York', 'US', 40.64, -73.78, 'America/New_York'],
  ['EWR', 'Newark Liberty', 'New York', 'US', 40.69, -74.17, 'America/New_York'],
  ['BOS', 'Logan', 'Boston', 'US', 42.36, -71.01, 'America/New_York'],
  ['IAD', 'Dulles', 'Washington', 'US', 38.95, -77.46, 'America/New_York'],
  ['MIA', 'Miami', 'Miami', 'US', 25.80, -80.29, 'America/New_York'],
  ['ATL', 'Hartsfield–Jackson', 'Atlanta', 'US', 33.64, -84.43, 'America/New_York'],
  ['ORD', 'O’Hare', 'Chicago', 'US', 41.98, -87.90, 'America/Chicago'],
  ['DFW', 'Dallas/Fort Worth', 'Dallas', 'US', 32.90, -97.04, 'America/Chicago'],
  ['DEN', 'Denver', 'Denver', 'US', 39.86, -104.67, 'America/Denver'],
  ['LAX', 'Los Angeles', 'Los Angeles', 'US', 33.94, -118.41, 'America/Los_Angeles'],
  ['SFO', 'San Francisco', 'San Francisco', 'US', 37.62, -122.38, 'America/Los_Angeles'],
  ['SEA', 'Seattle–Tacoma', 'Seattle', 'US', 47.45, -122.31, 'America/Los_Angeles'],
  ['YYZ', 'Pearson', 'Toronto', 'CA', 43.68, -79.63, 'America/Toronto'],
  ['YVR', 'Vancouver', 'Vancouver', 'CA', 49.19, -123.18, 'America/Vancouver'],
  ['MEX', 'Benito Juárez', 'Mexico City', 'MX', 19.44, -99.07, 'America/Mexico_City'],
  ['CUN', 'Cancún', 'Cancún', 'MX', 21.04, -86.87, 'America/Cancun'],
  ['GRU', 'Guarulhos', 'São Paulo', 'BR', -23.43, -46.47, 'America/Sao_Paulo'],
  ['EZE', 'Ezeiza', 'Buenos Aires', 'AR', -34.82, -58.54, 'America/Argentina/Buenos_Aires'],
  ['BOG', 'El Dorado', 'Bogotá', 'CO', 4.70, -74.15, 'America/Bogota'],
  ['DEL', 'Indira Gandhi', 'Delhi', 'IN', 28.56, 77.10, 'Asia/Kolkata'],
  ['BOM', 'Chhatrapati Shivaji', 'Mumbai', 'IN', 19.09, 72.87, 'Asia/Kolkata'],
  ['BKK', 'Suvarnabhumi', 'Bangkok', 'TH', 13.69, 100.75, 'Asia/Bangkok'],
  ['SIN', 'Changi', 'Singapore', 'SG', 1.36, 103.99, 'Asia/Singapore'],
  ['KUL', 'Kuala Lumpur', 'Kuala Lumpur', 'MY', 2.75, 101.71, 'Asia/Kuala_Lumpur'],
  ['DPS', 'Ngurah Rai', 'Bali', 'ID', -8.75, 115.17, 'Asia/Makassar'],
  ['HKG', 'Hong Kong', 'Hong Kong', 'HK', 22.31, 113.92, 'Asia/Hong_Kong'],
  ['PEK', 'Capital', 'Beijing', 'CN', 40.08, 116.58, 'Asia/Shanghai'],
  ['PVG', 'Pudong', 'Shanghai', 'CN', 31.14, 121.81, 'Asia/Shanghai'],
  ['ICN', 'Incheon', 'Seoul', 'KR', 37.46, 126.44, 'Asia/Seoul'],
  ['NRT', 'Narita', 'Tokyo', 'JP', 35.77, 140.39, 'Asia/Tokyo'],
  ['HND', 'Haneda', 'Tokyo', 'JP', 35.55, 139.78, 'Asia/Tokyo'],
  ['SYD', 'Kingsford Smith', 'Sydney', 'AU', -33.94, 151.18, 'Australia/Sydney'],
  ['MEL', 'Tullamarine', 'Melbourne', 'AU', -37.67, 144.84, 'Australia/Melbourne'],
  ['AKL', 'Auckland', 'Auckland', 'NZ', -37.01, 174.79, 'Pacific/Auckland'],
];

export const AIRPORTS: readonly Airport[] = RAW.map(
  ([iata, name, city, country, lat, lon, tz]) => ({
    iata,
    name,
    city,
    country,
    lat,
    lon,
    tz,
  }),
);

const BY_IATA = new Map(AIRPORTS.map((a) => [a.iata, a]));

export function airportByIata(iata: string): Airport | undefined {
  return BY_IATA.get(iata.toUpperCase());
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Autocomplete: exact IATA first, then city/name prefix, then substring. */
export function searchAirports(input: string, limit = 8): Airport[] {
  const q = fold(input.trim());
  if (!q) return [];
  const scored: [number, Airport][] = [];
  for (const a of AIRPORTS) {
    const city = fold(a.city);
    const name = fold(a.name);
    let rank = -1;
    if (a.iata.toLowerCase() === q) rank = 0;
    else if (city.startsWith(q)) rank = 1;
    else if (name.startsWith(q) || a.iata.toLowerCase().startsWith(q)) rank = 2;
    else if (city.includes(q) || name.includes(q)) rank = 3;
    if (rank >= 0) scored.push([rank, a]);
  }
  return scored
    .sort((x, y) => x[0] - y[0] || x[1].city.localeCompare(y[1].city))
    .slice(0, limit)
    .map(([, a]) => a);
}

/** Great-circle distance in km. */
export function distanceKm(
  a: Pick<Airport, 'lat' | 'lon'>,
  b: Pick<Airport, 'lat' | 'lon'>,
): number {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
