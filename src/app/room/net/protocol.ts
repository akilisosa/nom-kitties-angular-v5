// Wire protocol for the realtime room channel (/default/rooms/<roomId>).
// All positions are in world units (see WORLD_SIZE in ../engine/kitty-engine.ts), never screen pixels.

export const PROTOCOL_VERSION = 1;

// Type aliases rather than interfaces: the Amplify events client only accepts JSON-shaped
// types (DocumentType), and interfaces don't satisfy its index signature.
export type Treat = {
  id: string;
  x: number;
  y: number;
};

/** userId -> treats eaten this round */
export type Scores = Record<string, number>;

type Envelope<T extends string> = {
  v: typeof PROTOCOL_VERSION;
  type: T;
  /** sender userId (Cognito sub) */
  from: string;
  /** sender's Date.now() */
  ts: number;
};

/** Presence. A non-reply hello asks everyone to answer with their own hello (reply: true). */
export type HelloMsg = Envelope<'hello'> & { name: string; color: string; reply?: boolean };
export type HeartbeatMsg = Envelope<'heartbeat'>;
export type ByeMsg = Envelope<'bye'>;
/** Sender's own kitty: position and velocity (world units, units/s). */
export type StateMsg = Envelope<'state'> & { x: number; y: number; vx: number; vy: number };
/** Host only: the full treat list plus the current score table. */
export type TreatsMsg = Envelope<'treats'> & { treats: Treat[]; scores: Scores };
/** Player asks the host for a treat. */
export type ClaimMsg = Envelope<'claim'> & { id: string };
/** Host only: treat `id` went to `by`. */
export type ScoredMsg = Envelope<'scored'> & { id: string; by: string; scores: Scores };
/** Host only: round over. */
export type EndMsg = Envelope<'end'> & { scores: Scores; winners: string[] };

export type RoomMessage =
  | HelloMsg
  | HeartbeatMsg
  | ByeMsg
  | StateMsg
  | TreatsMsg
  | ClaimMsg
  | ScoredMsg
  | EndMsg;

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** What callers hand to RoomSessionService.publish; the session stamps v/from/ts. */
export type OutgoingMessage = DistributiveOmit<RoomMessage, 'v' | 'from' | 'ts'>;

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const areNumbers = (obj: Json, ...keys: string[]) =>
  keys.every((key) => typeof obj[key] === 'number' && Number.isFinite(obj[key]));

const areStrings = (obj: Json, ...keys: string[]) =>
  keys.every((key) => typeof obj[key] === 'string');

const isScores = (value: unknown): value is Scores =>
  isObject(value) && Object.values(value).every((score) => typeof score === 'number');

const isTreat = (value: unknown): value is Treat =>
  isObject(value) && areStrings(value, 'id') && areNumbers(value, 'x', 'y');

/** Returns a typed message, or null for anything malformed or from another protocol version. */
export function parseMessage(raw: unknown): RoomMessage | null {
  if (!isObject(raw) || raw['v'] !== PROTOCOL_VERSION) return null;
  if (!areStrings(raw, 'type', 'from') || !areNumbers(raw, 'ts')) return null;

  const valid = (() => {
    switch (raw['type']) {
      case 'hello':
        return areStrings(raw, 'name', 'color');
      case 'heartbeat':
      case 'bye':
        return true;
      case 'state':
        return areNumbers(raw, 'x', 'y', 'vx', 'vy');
      case 'treats':
        return Array.isArray(raw['treats']) && raw['treats'].every(isTreat) && isScores(raw['scores']);
      case 'claim':
        return areStrings(raw, 'id');
      case 'scored':
        return areStrings(raw, 'id', 'by') && isScores(raw['scores']);
      case 'end':
        return (
          isScores(raw['scores']) &&
          Array.isArray(raw['winners']) &&
          raw['winners'].every((w) => typeof w === 'string')
        );
      default:
        return false;
    }
  })();

  return valid ? (raw as unknown as RoomMessage) : null;
}
