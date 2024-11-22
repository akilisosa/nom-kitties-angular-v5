import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AmplifyAuthenticatorModule, AuthenticatorService } from '@aws-amplify/ui-angular';
import { Hub } from 'aws-amplify/utils';

@Component({ 
  selector: 'app-auth',
  imports: [ AmplifyAuthenticatorModule],
  standalone: true,
  providers: [ AuthenticatorService ],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css'
})
export class AuthComponent implements OnInit{

  constructor(private router: Router) {}

  ngOnInit() {
    Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
        case 'signedIn':
          console.log('user have been signedIn successfully.');
          this.router.navigate(['/dashboard']);
          break;
        case 'signedOut':
          console.log('user have been signedOut successfully.');
          break;
        case 'tokenRefresh':
          console.log('auth tokens have been refreshed.');
          break;
        case 'tokenRefresh_failure':
          console.log('failure while refreshing auth tokens.');
          break;
        case 'signInWithRedirect':
          console.log('signInWithRedirect API has successfully been resolved.');
          break;
        case 'signInWithRedirect_failure':
          console.log('failure while trying to resolve signInWithRedirect API.');
          break;
        case 'customOAuthState':
          console.info('custom state returned from CognitoHosted UI');
          break;
      }
    });
  }

}
