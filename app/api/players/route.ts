import { json } from '@/lib/api';
import { searchPlayers } from '@/lib/listone';

export function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q') ?? '';
  return json(searchPlayers(q, 12));
}
