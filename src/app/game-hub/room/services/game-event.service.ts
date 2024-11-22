(window as any).global = window;
(window as any).process = {
  env: { DEBUG: undefined }
};


import { Injectable } from '@angular/core';
import { client } from './apollo-config';
import { gql } from 'apollo-angular';
import { HttpClient } from '@angular/common/http';


@Injectable({
  providedIn: 'root'
})
export class GameEventService {

  private httpEndpoint = 'https://hjzp2ynwl5ehvjn4lihvnesplm.appsync-api.us-east-1.amazonaws.com/event';
  private apiKey = 'da2-bmfwwzhplnb4bg3vdkik62u3ba';


  constructor(private http: HttpClient) { }

  subscribeToEvents(channelName: string) {
   return client.subscribe({
    query: gql`
      subscription {
        event(channel: "${channelName}") {
          message
        }
      }
    `
  })
}

publishEvent(channelName: string, message: any) {
  const body = {
    channel: channelName,
    events: [JSON.stringify(message)]
  };

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': this.apiKey
  };

  return this.http.post(this.httpEndpoint, body, { headers });
}


}
