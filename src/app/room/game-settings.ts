// Room-level game options, picked by the owner when creating the room or in the lobby.
// Stored as JSON in Room.settings; round length and round count use the existing Room
// columns (timeLimit, totalRounds). Everything here falls back to defaults field by field,
// so a missing or malformed value never breaks a room.

export const TREAT_SPAWNING_CHOICES = ['host', 'everyone'] as const;
/** host: the owner spawns every treat. everyone: each player in the round spawns their own. */
export type TreatSpawning = (typeof TREAT_SPAWNING_CHOICES)[number];

export const TREATS_ON_FLOOR_CHOICES = [3, 5, 8] as const;

/** Multipliers on KITTY_SPEED (engine/kitty-engine.ts). */
export const KITTY_SPEED_MULTIPLIERS = { slow: 0.7, normal: 1, fast: 1.4 } as const;
export type KittySpeed = keyof typeof KITTY_SPEED_MULTIPLIERS;
export const KITTY_SPEED_CHOICES = Object.keys(KITTY_SPEED_MULTIPLIERS) as KittySpeed[];

export const ROUND_LENGTH_CHOICES = [30, 60, 90] as const;
export const ROUND_COUNT_CHOICES = [1, 2, 3] as const;

/** In 'everyone' mode treatsOnFloor is per player, but the floor never holds more than this. */
export const MAX_TREATS_ON_FLOOR = 16;

export interface GameSettings {
  treatSpawning: TreatSpawning;
  /** Per spawner: the host in 'host' mode, each player in 'everyone' mode. */
  treatsOnFloor: number;
  kittySpeed: KittySpeed;
}

export const DEFAULT_SETTINGS: Readonly<GameSettings> = {
  treatSpawning: 'host',
  treatsOnFloor: 5,
  kittySpeed: 'normal',
};

/** Everything the owner can choose: the settings JSON plus the Room columns it sits next to. */
export interface RoomOptions extends GameSettings {
  /** Round length in seconds (Room.timeLimit). */
  timeLimit: number;
  /** Rounds per match (Room.totalRounds). */
  totalRounds: number;
}

export const DEFAULT_ROOM_OPTIONS: Readonly<RoomOptions> = {
  ...DEFAULT_SETTINGS,
  timeLimit: 30,
  totalRounds: 1,
};

/** The Room fields options are read from and written to. */
export interface RoomOptionColumns {
  settings?: string | null;
  timeLimit?: number | null;
  totalRounds?: number | null;
}

export function parseSettings(raw: string | null | undefined): GameSettings {
  const obj = parseObject(raw);
  return {
    treatSpawning: oneOf(obj['treatSpawning'], TREAT_SPAWNING_CHOICES, DEFAULT_SETTINGS.treatSpawning),
    treatsOnFloor: oneOf(obj['treatsOnFloor'], TREATS_ON_FLOOR_CHOICES, DEFAULT_SETTINGS.treatsOnFloor),
    kittySpeed: oneOf(obj['kittySpeed'], KITTY_SPEED_CHOICES, DEFAULT_SETTINGS.kittySpeed),
  };
}

export function roomOptions(room: RoomOptionColumns): RoomOptions {
  const timeLimit = room.timeLimit ?? 0;
  return {
    ...parseSettings(room.settings),
    timeLimit: timeLimit > 0 ? timeLimit : DEFAULT_ROOM_OPTIONS.timeLimit,
    // Rooms made before settings existed carry totalRounds=3 from a form field the game used
    // to ignore. They stay single-round, as they always played.
    totalRounds: room.settings
      ? oneOf(room.totalRounds, ROUND_COUNT_CHOICES, DEFAULT_ROOM_OPTIONS.totalRounds)
      : 1,
  };
}

/** The Room fields to write for these options. */
export function roomOptionColumns(options: RoomOptions): Required<RoomOptionColumns> {
  const settings: GameSettings = {
    treatSpawning: options.treatSpawning,
    treatsOnFloor: options.treatsOnFloor,
    kittySpeed: options.kittySpeed,
  };
  return {
    settings: JSON.stringify(settings),
    timeLimit: options.timeLimit,
    totalRounds: options.totalRounds,
  };
}

/** Treats each spawner keeps on the floor, capped so a full room stays readable. */
export function treatsPerSpawner(settings: GameSettings, spawners: number): number {
  if (settings.treatSpawning === 'host') return settings.treatsOnFloor;
  return Math.max(1, Math.min(settings.treatsOnFloor, Math.floor(MAX_TREATS_ON_FLOOR / Math.max(1, spawners))));
}

export function treatSpawningLabel(mode: TreatSpawning): string {
  return mode === 'everyone' ? 'Everyone spawns' : 'Host spawns';
}

function parseObject(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function oneOf<T>(value: unknown, choices: readonly T[], fallback: T): T {
  return choices.includes(value as T) ? (value as T) : fallback;
}
