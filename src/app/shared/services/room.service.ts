import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/api';
import { BehaviorSubject, async } from 'rxjs';
import { Schema } from '../../../../amplify/data/resource';
// import type { Schema } from '@/amplify/data/resource' 

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
 
//  .subscribe((room: any) => {
//   console.log('subscribing to room:', room)
//   this.room.next(room.data.onUpdateRoom);
//   });
}

async getRoomByCode(code: string) {
  const client = generateClient<Schema>({ authMode: 'apiKey' })
  let res;
  try {
    // res = (await client.models.Room['getBySimpleCode']({ simpleCode: code })).data;
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

async createNewRoom(room: any) { //} CreateRoomInput) {
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

async updateRoomWithPlayer(roomID: string, players: any[]) {
  const client: any = generateClient({ authMode: 'userPool' })
  let res;
  try {
    res = (await client.models.Room.update({
      id: roomID,
      players
    })).data;
    // res = await client.graphql({
    //   query: updateRoom,
    //   variables: {
    //     input: {
    //       id: roomID,
    //       players,
    //     }
    //   }
    // })
    console.log('joinroom', res.data)
    this.room.next(res.data)
  } catch (error) {
    console.error(error);
  }

  return res;
}


}
