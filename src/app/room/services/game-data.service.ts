import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import outputs from '../../../../amplify_outputs.json';

interface EventsOutputs {
  url: string; // https://<id>.appsync-api.<region>.amazonaws.com/event
  aws_region: string;
  default_authorization_type: string;
  api_key: string;
}

// Written by the backend (amplify/backend.ts) into amplify_outputs.json under custom.events
const eventsOutputs = (outputs as { custom?: { events?: EventsOutputs } }).custom?.events;
const eventsConfig = eventsOutputs && {
  httpDomain: new URL(eventsOutputs.url).host,
  realtimeDomain: new URL(eventsOutputs.url).host.replace('appsync-api', 'appsync-realtime-api'),
  apiKey: eventsOutputs.api_key,
};

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
  private readonly REALTIME_DOMAIN = eventsConfig?.realtimeDomain ?? '';
  private readonly HTTP_DOMAIN = eventsConfig?.httpDomain ?? '';
  private readonly API_KEY = eventsConfig?.apiKey ?? '';


  constructor() { }

  private getBase64URLEncoded(obj: any): string {
    return btoa(JSON.stringify(obj))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }


  connect() {
    if (!eventsConfig) {
      throw new Error('Events API config missing: amplify_outputs.json has no custom.events. Regenerate it after deploying the backend.');
    }

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
      id: crypto.randomUUID(),
      channel: channelPath,
      authorization: {
        'x-api-key': this.API_KEY,
        host: this.HTTP_DOMAIN
      }
    };

    this.sendStartMessage(subscriptionMessage);
    return subscriptionMessage.id;
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
    
    return fetch(endpoint, {
      "method": "POST",
      "headers": {
        "content-type": "channelName/json",
        "x-api-key": this.API_KEY
      },
      "body": JSON.stringify({
        "channel": channelName,
        "events": [
          JSON.stringify(eventData)
        ]
      })})
  }

  sendMessage(channelPath: string, data: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket connection not established');
    }

    const message = {
      type: 'data',
      id: crypto.randomUUID(),
      channel: channelPath,
      authorization: {
        'x-api-key': this.API_KEY,
        host: this.HTTP_DOMAIN
      },
      event: data
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
