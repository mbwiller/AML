/**
 * `/practice/quiz.json`: every gradable quiz item, rendered at build time
 * (src/lib/practice/quiz-bank.ts). Fetched when the Quiz tab first opens.
 */
import type { APIRoute } from 'astro';

import { getQuizBank } from '@/lib/practice/data';

export const GET: APIRoute = async () =>
  new Response(JSON.stringify(await getQuizBank()), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
