import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { AmplifyAuthenticatorModule, AuthenticatorService } from '@aws-amplify/ui-angular';
import { Hub } from 'aws-amplify/utils';
import { signIn, signUp, confirmSignUp } from 'aws-amplify/auth';
@Component({ 
  selector: 'app-auth',
  imports: [ AmplifyAuthenticatorModule,
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  standalone: true,
  providers: [ AuthenticatorService ],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css'
})
export class AuthComponent implements OnInit{

  authState: 'signIn' | 'signUp' | 'confirmSignUp' = 'signIn';
  error: string = '';


  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    code: ['']
  });

  constructor(private router: Router, private fb: FormBuilder) {}

  async handleSignIn() {
    console.log('doing this')
    const { email, password } = this.form.value;
    try {
      if(!email || !password) {
        this.error = 'Please enter your email and password.';
        return;
      }
      const a = await signIn({ username: email, password });
      console.log('a is', a)
      this.router.navigate(['/dashboard']);
    } catch (error) {
      console.log('error is', error)
      this.error = 'Failed to sign in. Please check your credentials.';
    }
  }

  async handleSignUp() {
    const { email, password } = this.form.value;
    try {
      if(!email || !password) {
        this.error = 'Please enter your email and password.';
        return;
      }
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email
          }
        }
      });
      this.authState = 'confirmSignUp';
    } catch (error) {
      this.error = 'Failed to sign up. Please try again.';
    }
  }

  async handleConfirmSignUp() {
    const { email, code } = this.form.value;
    try {
      if(!email || !code) {
        this.error = 'Please enter your email and confirmation code.';
        return;
      }
      await confirmSignUp({
        username: email,
        confirmationCode: code
      });
      this.authState = 'signIn';
    } catch (error) {
      this.error = 'Failed to confirm sign up. Please try again.';
    }
  }

  switchToSignUp() {
    this.authState = 'signUp';
    this.error = '';
  }

  switchToSignIn() {
    this.authState = 'signIn';
    this.error = '';
  }

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
