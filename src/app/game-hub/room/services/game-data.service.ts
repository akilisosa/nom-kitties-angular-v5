import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

interface WebSocketMessage {
  type: string;
  id?: string;
  channel?: string;
  authorization?: {
    'x-api-key': string;
    host: string;
  };
  payload?: any;
}

@Injectable({
  providedIn: 'root'
})
export class GameDataService {

  private ws!: WebSocket;
  private messageSubject = new Subject<any>();
  private readonly REALTIME_DOMAIN = 'hjzp2ynwl5ehvjn4lihvnesplm.appsync-realtime-api.us-east-1.amazonaws.com';
  private readonly HTTP_DOMAIN = 'hjzp2ynwl5ehvjn4lihvnesplm.appsync-api.us-east-1.amazonaws.com';
  private readonly API_KEY = 'da2-bmfwwzhplnb4bg3vdkik62u3ba';


  constructor() { }

  private getBase64URLEncoded(obj: any): string {
    return btoa(JSON.stringify(obj))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }


  connect() {
    // Create authorization header
    const authorization = {
      host: this.HTTP_DOMAIN,
      'x-api-key': this.API_KEY
    };
    
    const header = this.getBase64URLEncoded(authorization);
    const subProtocols = [`header-${header}`, 'aws-appsync-event-ws'];
    
    // Create WebSocket connection
    this.ws = new WebSocket(`wss://${this.REALTIME_DOMAIN}/event/realtime`, subProtocols);

    // Set up event handlers
    this.ws.onopen = () => {
      console.log('WebSocket connection established');
      // Send connection init message
      this.sendStartMessage({
        type: 'connection_init'
      });
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received:', data);

      switch (data.type) {
        case 'connection_ack':
          console.log('Connection acknowledged');
          break;
        case 'ka':
          // Keep alive message, no action needed
          break;
        case 'subscription_ack':
          console.log('Subscription acknowledged:', data);
          break;
        case 'data':
          this.messageSubject.next(data);
          break;
        case 'error':
          console.error('WebSocket error:', data);
          break;
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    return this.messageSubject.asObservable();
  }

  subscribe(channelPath: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket connection not established');
    }

    const subscriptionMessage: WebSocketMessage = {
      type: 'subscribe',
      id: uuidv4(),
      channel: channelPath,
      authorization: {
        'x-api-key': this.API_KEY,
        host: this.HTTP_DOMAIN
      }
    };

    this.sendStartMessage(subscriptionMessage);
  }

  unsubscribe(subscriptionId: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendStartMessage({
        type: 'unsubscribe',
        id: subscriptionId
      });
    }
  }

  publishEvent(channelName: string, eventData: any) {
    const endpoint = `https://${this.HTTP_DOMAIN}/event`;
    
    const mutation = {
      query: `mutation PublishEvent($channelName: String!, $event: AWSJSON!) {
        publish(channelName: $channelName, event: $event) {
          event
        }
      }`,
      variables: {
        channelName: channelName,
        type: 'data',
        event: JSON.stringify(["my event content"])
      }
    };

    const data = {
      type: 'data',
      channel: channelName,
      event: JSON.stringify(eventData)
    }

    return fetch(endpoint, {
      "method": "POST",
      "headers": {
        "content-type": "application/json",
        "x-api-key": this.API_KEY
      },
      "body": JSON.stringify({
        "channel": "default/messages",
        "events": [
          "{\"event_1\":\"data_1\"}",
          "{\"event_2\":\"data_2\"}"
        ]
      })})
  }

  sendMessage(channelPath: string, data: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket connection not established');
    }

    const message = {
      type: 'data',
      id: uuidv4(),
      channel: channelPath,
      authorization: {
        'x-api-key': this.API_KEY,
        host: this.HTTP_DOMAIN
      },
      event: "data"
    };

    this.ws.send(JSON.stringify(message));
  }

  private sendStartMessage(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }

}
