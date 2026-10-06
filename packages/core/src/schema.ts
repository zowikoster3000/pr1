import { z } from 'zod';
import { MoneySchema } from './money';

export const IataSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, 'Expected a 3-letter IATA code');

const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

/** Local wall-clock time at the airport, as published by the carrier: YYYY-MM-DDTHH:mm. */
const LocalDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);

export const CabinSchema = z.enum(['economy', 'premium_economy', 'business', 'first']);
export type Cabin = z.infer<typeof CabinSchema>;

export const SearchQuerySchema = z
  .object({
    origin: IataSchema,
    destination: IataSchema,
    departDate: IsoDate,
    returnDate: IsoDate.optional(),
    adults: z.coerce.number().int().min(1).max(9).default(1),
    cabin: CabinSchema.default('economy'),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .default('EUR'),
  })
  .refine((q) => q.origin !== q.destination, {
    message: 'Origin and destination must differ',
    path: ['destination'],
  })
  .refine((q) => !q.returnDate || q.returnDate >= q.departDate, {
    message: 'Return date must be on or after departure',
    path: ['returnDate'],
  });
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const SegmentSchema = z.object({
  carrierCode: z.string().min(2).max(3),
  carrierName: z.string(),
  flightNumber: z.string(),
  origin: IataSchema,
  destination: IataSchema,
  departLocal: LocalDateTime,
  arriveLocal: LocalDateTime,
  durationMinutes: z.number().int().positive(),
});
export type Segment = z.infer<typeof SegmentSchema>;

export const SliceSchema = z.object({
  segments: z.array(SegmentSchema).min(1),
  /** Door-to-door duration of this slice including layovers. */
  durationMinutes: z.number().int().positive(),
});
export type Slice = z.infer<typeof SliceSchema>;

export const OfferSchema = z.object({
  id: z.string(),
  providerId: z.string(),
  slices: z.array(SliceSchema).min(1).max(2),
  price: MoneySchema,
  /** True when the itinerary is made of separately-ticketed parts (self-transfer risk). */
  separateTickets: z.boolean().default(false),
  /** Price is the round-trip total but only the outbound slice is known; return is picked at the provider. */
  returnSelectedAtProvider: z.boolean().default(false),
  deepLink: z.url({ protocol: /^https$/ }),
  fetchedAt: z.iso.datetime(),
});
export type Offer = z.infer<typeof OfferSchema>;
