import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/api';
import { Schema } from '../../../../amplify/data/resource';
// import { ModelSortDirection } from 'src/API';
// import { createMessage, sendChatMessage } from 'src/graphql/mutations';
// import { messagesByRoomIDAndCreatedAt } from 'src/graphql/queries';
// import { onCreateMessage, onMessageReceived } from 'src/graphql/subscriptions';
// import { events } from 'aws-amplify/data';


@Injectable({
  providedIn: 'root'
})
export class ChatService {



  constructor() { }

  async sendChat(roomID: string, message: string, color: string, sender: string) {  
    const client = generateClient<Schema>({authMode: 'userPool'});
    let res;
    try {
      res = await client.models.Message.create({
        roomID,
        content: message,
        color,
        name: sender,
        createdAt: new Date().toISOString(),
   
      });

    } catch (error) {
      console.error(error);
    }
  }

 async getLastMessages(id: string) {
    const client = generateClient({authMode: 'userPool'});
    let res;
    // try {
    //   res = (await client.graphql({
    //     query: messagesByRoomIDAndCreatedAt,
    //     variables: {
    //       roomID: id,
    //       sortDirection: ModelSortDirection.DESC,
    //       limit: 20,
    //     }}
    //   )).data.messagesByRoomIDAndCreatedAt.items.reverse();
    //   console.log('res', res);
    // } catch (error) {
    //   console.error(error);
    // }

    return res;
  }


  subscribeToChat(roomID: string) {
    const client = generateClient({authMode: 'userPool'});
  //  return client.graphql({
  //     query: onCreateMessage,
  //     variables: {
  //       filter: {
  //         roomID: { eq: roomID }
  //       }
  //     }
    // })  .subscribe({
    //   next: (data: any) => {
    //     console.log(data);
    //   },
    //   error: (error: any) => {
    //     console.error(error);
    //   },
    // })
    // })
  }





  async sendChatv1(roomID: string, message: string, color: string, sender: string) {
   const client = generateClient({authMode: 'userPool'});
    let res; 
    // try {
    //   res = await client.graphql({
    //     query: sendChatMessage,
    //     variables: {
    //       roomID,
    //       message,
    //       color,
    //       sender
    //     }
    //   });
    // } catch (error) {
    //   console.error(error);
    // }
  }

  subscribeToChatv1(roomID: string) {
    const client = generateClient({authMode: 'userPool'});
  //  return client.graphql({
  //     query: onMessageReceived,
  //     variables: {
  //       roomID,
  //     }
  //   })  .subscribe({
  //     next: (data: any) => {
  //       console.log(data);
  //     },
  //     error: (error: any) => {
  //       console.error(error);
  //     },
  //   })
  }
}


  // TODO 

  // events api 

//   async sendMessage(id: string, message: string) {
//     const channel = await events.post(`/gameroom/${id}`, message);
//   }


//   async subscribeToChat(id: string) {
//     const channel = await events.connect(`/gameroom/${id}`);
//     return channel.subscribe({
//       next: (data) => {
//         console.log(data);
//       },
//       error: (error) => {
//         console.error(error);
//       },
//   })
// }

// }
