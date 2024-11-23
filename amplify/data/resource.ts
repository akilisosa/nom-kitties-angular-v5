import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/*== STEP 1 ===============================================================
The section below creates a Todo database table with a "content" field. Try
adding a new "isDone" field as a boolean. The authorization rule below
specifies that any user authenticated via an API key can "create", "read",
"update", and "delete" any "Todo" records.
=========================================================================*/
const schema = a.schema({
  Todo: a
    .model({
      content: a.string(),
    })
    .authorization((allow) => [allow.publicApiKey()]),

    User: a
    .model({
      name: a.string().required(),
      color: a.string().required(),
      type: a.string(),
      score: a.integer(),
      gamesPlayed: a.integer(),
      wins: a.integer(),
      losses: a.integer(),
      owner: a.string().required(),
    })
    .secondaryIndexes((index: any) => [
      index('owner'),
    ])
    .authorization((allow: any) => [
      // Owner can do all operations
      allow.owner(),
      // Public can read
      allow.publicApiKey().to(['read']),
    ]),

      // message 
  Message: a.
  model({
    content: a.string().required(),
    roomID: a.string().required(),
    createdAt: a.datetime().required(),
    color: a.string().required(),
    name: a.string().required(),
  })
  .secondaryIndexes((index: any) => [
    index('roomID').sortKeys(['createdAt']),
  ])
  .authorization((allow: any) => [
    // Owner can do all operations
    allow.owner(),
    // Public can read
    allow.publicApiKey() //.to(['create', 'read']),
  ]),

   // ROOM
   Room: a
   .model({
     public: a.string().required(),
     mode: a.string().required(),
     totalRounds: a.integer(),
     timeLimit: a.integer(),
     playersPerRound: a.integer(),

     roomLimit: a.integer(),
     simpleCode: a.string().required(),
    
     name: a.string().required(),
     status: a.enum(['WAITING', 'PLAYING', 'FINISHED', 'CANCELLED', 'STARTING']),

     full: a.boolean(),

     currentPlayers: a.string().array().authorization(
       (allow: any) => [allow.owner(),
       allow.authenticated().to(['read',]),
       allow.publicApiKey().to(['read',])],
     ),

     gameStartTime: a.datetime(),

     stats: a.string(), // JSON

     players: a.string().array()
       .authorization(
         (allow: any) => [allow.owner(),
         allow.authenticated().to(['read', 'update']),
         allow.publicApiKey().to(['read', 'update'])],
       ),


     spectators: a.string().array(),
     currentRound: a.integer(),
     winner: a.string(),

     // standard
     owner: a.string().required(),
     createdAt: a.datetime(),
   })
   .secondaryIndexes((index: any) => [
     index('public').sortKeys(['createdAt']),
     index('mode').sortKeys(['createdAt']),
     index('simpleCode'),
   ])
   .authorization((allow: any) => [
     // Owner can do all operations
     allow.owner(),
     allow.authenticated().to(['read']),
     // Public can read
     allow.publicApiKey().to(['read']),
   ]),




});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    // API Key is used for a.allow.public() rules
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server 
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: todos } = await client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>
