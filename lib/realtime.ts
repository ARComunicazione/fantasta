// Broadcast verso i client: Ably se configurato, altrimenti niente (i client fanno polling).
import Ably from 'ably';

export const channelName = (code: string) => `asta:${code}`;
export const realtimeEnabled = () => !!process.env.ABLY_API_KEY;

let rest: Ably.Rest | null = null;
function client() {
  if (!rest && process.env.ABLY_API_KEY) rest = new Ably.Rest({ key: process.env.ABLY_API_KEY });
  return rest;
}

export type LiveEvent = 'call' | 'state';

export async function publish(code: string, event: LiveEvent, data: unknown) {
  const c = client();
  if (!c) return;
  try {
    await c.channels.get(channelName(code)).publish(event, data);
  } catch (e) {
    console.error('Ably publish', e);
  }
}

export async function tokenRequest(code: string, clientId: string) {
  const c = client();
  if (!c) return null;
  return c.auth.createTokenRequest({ clientId, capability: { [channelName(code)]: ['subscribe'] } });
}
