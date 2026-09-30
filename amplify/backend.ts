import { defineBackend } from '@aws-amplify/backend';
import { Duration, Expiration } from 'aws-cdk-lib';
import {
  AppSyncAuthorizationType,
  ChannelNamespace,
  EventApi,
} from 'aws-cdk-lib/aws-appsync';
import { auth } from './auth/resource';
import { data } from './data/resource';

const backend = defineBackend({
  auth,
  data,
});

// Realtime game channel: an AppSync Events API, separate from the GraphQL API.
// The client (GameDataService) reads its endpoints and key from amplify_outputs.json (custom.events).
const eventsStack = backend.createStack('events');

const apiKeyAuth = {
  authorizationType: AppSyncAuthorizationType.API_KEY,
  apiKeyConfig: {
    // 365 days is the maximum. The key expires after this; redeploy with a changed
    // value to rotate it at least yearly.
    expires: Expiration.after(Duration.days(365)),
  },
};

const eventApi = new EventApi(eventsStack, 'NomKittiesEvents', {
  apiName: 'nomkitties-events',
  authorizationConfig: {
    authProviders: [apiKeyAuth],
    connectionAuthModeTypes: [AppSyncAuthorizationType.API_KEY],
    defaultPublishAuthModeTypes: [AppSyncAuthorizationType.API_KEY],
    defaultSubscribeAuthModeTypes: [AppSyncAuthorizationType.API_KEY],
  },
});

// Clients use channel paths like /default/messages/<roomId>
new ChannelNamespace(eventsStack, 'DefaultNamespace', {
  api: eventApi,
  channelNamespaceName: 'default',
});

const apiKey = Object.values(eventApi.apiKeys)[0];

// This is the shape aws-amplify reads from custom.events, so Amplify.configure(outputs)
// also sets API.Events (alongside API.GraphQL) for the `events` client in aws-amplify/data.
backend.addOutput({
  custom: {
    events: {
      url: `https://${eventApi.httpDns}/event`,
      aws_region: eventsStack.region,
      default_authorization_type: AppSyncAuthorizationType.API_KEY,
      api_key: apiKey.attrApiKey,
    },
  },
});
