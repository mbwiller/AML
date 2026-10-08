/**
 * `/practice/deck.json`: every flashcard, rendered at build time
 * (src/lib/practice/cards.ts). Fetched by the practice island on load.
 */
import type { APIRoute } from 'astro';

import { getDeck } from '@/lib/practice/data';

export const GET: APIRoute = async () =>
  new Response(JSON.stringify(await getDeck()), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
