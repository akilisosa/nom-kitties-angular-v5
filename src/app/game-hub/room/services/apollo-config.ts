import { createAuthLink } from 'aws-appsync-auth-link';
import { createSubscriptionHandshakeLink } from 'aws-appsync-subscription-link';
import { ApolloLink } from '@apollo/client/core';
import { HttpLink } from '@apollo/client/link/http';
import { ApolloClient, InMemoryCache } from '@apollo/client/core';

// Your config  https://hjzp2ynwl5ehvjn4lihvnesplm.appsync-api.us-east-1.amazonaws.com/event',
const config = {
  url:  'hjzp2ynwl5ehvjn4lihvnesplm.appsync-realtime-api.us-east-1.amazonaws.com',
  region: 'us-east-1',
  auth: {
    type: "API_KEY" as "API_KEY",
    apiKey: 'da2-bmfwwzhplnb4bg3vdkik62u3ba'
  }
};

const httpLink = new HttpLink({ uri: config.url });

const link = ApolloLink.from([
  createAuthLink({ 
    url: config.url, 
    region: config.region, 
    auth: config.auth 
  }),
  createSubscriptionHandshakeLink(
    { 
      url: config.url, 
      region: config.region, 
      auth: config.auth 
    }, 
    httpLink
  )
]);

// Create the client
const client = new ApolloClient({
  link,
  cache: new InMemoryCache()
});

export { client };
