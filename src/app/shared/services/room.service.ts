import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/api';
import { BehaviorSubject, Observable } from 'rxjs';
import type { Schema } from '../../../../amplify/data/resource';

export type Room = Schema['Room']['type'];

type RoomUpdate = { id: string } & Partial<
  Pick<Room, 'status' | 'gameStartTime' | 'currentPlayers' | 'winners' | 'stats'>
>;

/** Rooms are always looked up by their uppercase code. */
export const normalizeRoomCode = (code: string) => code.trim().toUpperCase();

/** Reads use the public API key; writes go through the signed-in user. */
const readClient = () => generateClient<Schema>({ authMode: 'apiKey' });
const userClient = () => generateClient<Schema>({ authMode: 'userPool' });

/** How far back the game hub looks for open rooms. */
const ROOM_LIST_WINDOW_MS = 24 * 60 * 60 * 1000;

@Injectable({
  providedIn: 'root'
})
export class RoomService {

room = new BehaviorSubject<Room | null>(null);

roomList = new BehaviorSubject<Room[]>([]);


constructor() { }

roomShared() {
  return this.room.asObservable();
}

roomListShared() {
  return this.roomList.asObservable();
}

/** Live updates to one room (owner writes: status, timing, winners). */
observeRoom(id: string): Observable<Room> {
  return readClient().models.Room.onUpdate({ filter: { id: { eq: id } } });
}

async getRoom(id: string): Promise<Room | null> {
  try {
    return (await readClient().models.Room.get({ id })).data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

async getRoomByCode(code: string): Promise<Room | undefined> {
  let res: Room | undefined;
  try {
    res = (await readClient().models.Room.listRoomBySimpleCode({
      simpleCode: normalizeRoomCode(code),
    })).data[0];
    this.room.next(res ?? null);
  } catch (error) {
    console.error(error);
  }
  return res;
}

async createNewRoom(room: any) {
  const client: any = generateClient({ authMode: 'userPool' })
  let res;
  try {
    res = (await client.models.Room.create(room)).data;

    this.room.next(res);
  } catch (error) {
    console.error(error);
  }

  return res;

}

removeFromRoomList(id: string) {
  const currentList = this.roomList.getValue();
  const newList = currentList.filter((room) => room.id !== id);
  this.roomList.next(newList);
}

/** Open public rooms from the last day, newest first. */
async getRoomList() {
  let res: Room[] = [];
  try {
    res = (await readClient().models.Room.listRoomByPublicAndCreatedAt(
      {
        public: 'public',
        createdAt: { gt: new Date(Date.now() - ROOM_LIST_WINDOW_MS).toISOString() },
      },
      { sortDirection: 'DESC', filter: { status: { eq: 'WAITING' } } },
    )).data;
    this.roomList.next(res);
  }
   catch (error) {
    console.log(error);
  }
  return res;
}

/** Atomically adds the caller to the room. Returns an error message if refused. */
async joinRoom(roomId: string): Promise<{ room?: Room | null; error?: string }> {
  try {
    const { data, errors } = await userClient().mutations.joinRoom({ roomId });
    if (errors?.length) {
      return { error: errors[0].message };
    }
    return { room: data as Room | null };
  } catch (error) {
    console.error(error);
    return { error: 'Could not join the room.' };
  }
}

/** Atomically removes the caller from the room. */
async leaveRoom(roomId: string): Promise<void> {
  try {
    await userClient().mutations.leaveRoom({ roomId });
  } catch (error) {
    console.error(error);
  }
}

// ---- Owner-only writes ----------------------------------------------------

/** WAITING -> STARTING: everyone counts down to gameStartTime. */
async startGame(id: string, gameStartTime: string, currentPlayers: string[]) {
  return this.ownerUpdate({ id, status: 'STARTING', gameStartTime, currentPlayers, winners: [], stats: null });
}

/** STARTING -> PLAYING, written by the host when gameStartTime arrives. */
async setPlaying(id: string) {
  return this.ownerUpdate({ id, status: 'PLAYING' });
}

async finishGame(id: string, winners: string[], stats: string) {
  return this.ownerUpdate({ id, status: 'FINISHED', winners, stats });
}

async reopenRoom(id: string) {
  return this.ownerUpdate({ id, status: 'WAITING' });
}

/** Host left: other clients see CANCELLED and head back to the hub. */
async cancelRoom(id: string) {
  return this.ownerUpdate({ id, status: 'CANCELLED' });
}

private async ownerUpdate(update: RoomUpdate) {
  try {
    const { data, errors } = await userClient().models.Room.update(update);
    if (errors?.length) console.error(errors);
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
}


}
