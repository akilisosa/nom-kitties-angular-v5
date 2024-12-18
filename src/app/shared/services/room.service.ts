import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/api';
import { BehaviorSubject } from 'rxjs';
import type { Schema } from '../../../../amplify/data/resource';


type Room = Schema['Room']['type'];
@Injectable({
  providedIn: 'root'
})
export class RoomService {


room = new BehaviorSubject<any>(null);

roomList = new BehaviorSubject<any[]>([]);


constructor() { }

roomShared() {
  return this.room.asObservable();
}

roomListShared() {
  return this.roomList.asObservable();
}

subscribeToRoomByID(id: any) {
  const client = generateClient<Schema>({ authMode: 'apiKey' })
  let res;
 return client.models.Room.onUpdate({ filter: { id: { eq: id } } })
 
}

 subscribeToRoomByCode(code: string) {
  const client = generateClient<Schema>({ authMode: 'apiKey' })
 return client.models.Room.observeQuery({ filter: { simpleCode: { eq: code } } })
}

async getRoomByCode(code: string) {
  const client: any = generateClient<Schema>({ authMode: 'apiKey' })
  let res;
  try {

    //  res = (await client.models.Room.listRoomsBySimpleCode({ simpleCode:code })).data;
    // console.log('getRoomByCode', res);
    res = (await client.models.Room.list({
      filter: {
        simpleCode: {
          eq: code
        }
      }
    
    })).data[0];
    this.room.next(res);
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

async deleteRoom(id: any) {
  const client = generateClient<Schema>({ authMode: 'userPool' })
  let res;
 let d =  (await client.models.Room.delete({ id })).data;
 let roomList = this.roomList.getValue();
  roomList = roomList.filter((room) => room.id !== id);
  this.roomList.next(roomList);
  this.room.next(null);
}

removeFromRoomList(id: string) {
  const currentList = this.roomList.getValue();
  const newList = currentList.filter((room) => room.id !== id);
  this.roomList.next(newList);
}

async updateRoomWithWinners(id: any, winners: any[]) {
  const client = generateClient<Schema>({ authMode: 'userPool' })
  let res;
  try {
    res = (await client.models.Room.update({
      id,
      winners,
      status: 'FINISHED'
    } as any)).data;

    console.log('updateRoomWithWinners', res)
    this.room.next(res)
  } catch (error) {
    console.error(error);
  }
}


async getRoomList() {
  const client: any = generateClient({ authMode: 'apiKey' })
  let res;
  try {
    res =  (await client.models.Room.list({
      filter: {
          status: {
              eq: 'WAITING'
          }
      },
    })).data;
    this.roomList.next(res);
  }
   catch (error) {
    console.log(error);
  } 
  return res;
}

async startGame(id: string, gameStartTime: string) {
  console.log('startGame', id, gameStartTime)
  const client = generateClient<Schema>({ authMode: 'userPool' })
  let res;
  try {
    res = (await client.models.Room.update({
      id,
      status: 'STARTING',
      gameStartTime
    } as any)).data;
    this.room.next(res);
  } catch (error) {
    console.error(error);
  }

  return res;
}

async playGame(id: any, currentPlayers: string[]) {
  console.log('startGame', id)
  const client = generateClient<Schema>({ authMode: 'userPool' })
  let res;
  try {
    res = (await client.models.Room.update({
      id,
      currentPlayers,
      status: 'PLAYING',
    } as any)).data;
    this.room.next(res);
  } catch (error) {
    console.error(error);
  }

  return res;
}

async joinRoom(id: any, players: string[]): Promise< any> {
  const client: any = generateClient({ authMode: 'userPool' })
  let res;
  try {
    res = (await client.models.Room .update({
      id,
      players
    })).data;

    console.log('joinroom', res.data)
    this.room.next(res.data)
  } catch (error) {
    console.error(error);
  }

  return res;
}



async updateRoomWithPlayer(id: string, players: any[]) {
  const client: any = generateClient({ authMode: 'apiKey' })
  let res;
  try {
    res = (await client.models.Room.update({
      id,
      players
    })).data;

    console.log('joinroom', res.data)
    this.room.next(res.data)
  } catch (error) {
    console.error(error);
  }

  return res;
}


}
