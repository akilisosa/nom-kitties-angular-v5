import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/api';
import { BehaviorSubject, async } from 'rxjs';
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
  const client = generateClient({ authMode: 'apiKey' })
  return // client.
}

async getRoomByCode(code: string) {
  const client: any = generateClient<any>({ authMode: 'apiKey' })
  let res;
  try {
    res = (await client.models.Room.getBySimpleCode({ simpleCode: code })).data;
    // res = (await client.graphql({
    //   query: roomsBySimpleCode,
    //   variables: {
    //     simpleCode: code,
    //   }
    // })).data.roomsBySimpleCode.items[0]
    this.room.next(res);
  } catch (error) {
    console.log(error);
  }
  return res;
}

async createNewRoom(room: any) { //} CreateRoomInput) {
  const client = generateClient({ authMode: 'userPool' })
  let res;
  // try {
  //   res = (await client.graphql({
  //     query: createRoom,
  //     variables: {
  //       input: room
  //     }
  //   })).data.createRoom;
  //   console.log('room created', res);
  //   this.room.next(res);
  // } catch (error) {
  //   console.log(error);
  // }

  return res;

}

async deleteRoom(id: any) {
  const client = generateClient({ authMode: 'userPool' })
  let res;
  // try {
  //   res = await client.graphql({
  //     query: deleteRoom,
  //     variables: {
  //       input: {
  //         id
  //       }
  //     }
  //   })
  //   this.removeFromRoomList(id);
  // } catch (error) {
  //   console.log(error);
  // }
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
    return (await client.models.Room.list({
      filter: {
          status: {
              eq: 'WAITING'
          }
      },
    })).data;
    console.log('room list', res);
  }
   catch (error) {
    console.log(error);
  }
  return res;
}

async updateRoomWithPlayer(roomID: string, players: any[]) {
  const client = generateClient({ authMode: 'userPool' })
  let res;
  // try {
  //   res = await client.graphql({
  //     query: updateRoom,
  //     variables: {
  //       input: {
  //         id: roomID,
  //         players,
  //       }
  //     }
  //   })
  //   console.log('joinroom', res.data.updateRoom);
  //   this.room.next(res.data.updateRoom

  //   );
  // } catch (error) {
  //   console.log(error);
  // }

  return res;
}


}
