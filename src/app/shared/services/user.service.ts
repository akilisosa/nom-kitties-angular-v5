import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';

import { generateClient } from 'aws-amplify/data';
// import type { Schema } from '@/amplify/data/resource' 

@Injectable({
  providedIn: 'root'
})
export class UserService {

  user = new BehaviorSubject<any>(null);

  constructor(private authService: AuthService) { }

  userShared() {
    return this.user.asObservable();
  }

  async getUser() {
    const client = generateClient({ authMode: 'userPool' });
    const owner = (await this.authService.getCurrentUser()).userId;
    let res;

    try {
      // res = await client.models.User.getByOwner({ owner });

    } catch (error) {
      console.error(error);
    }
    // this.user.next(res?.data.usersByOwner.items[0]);
    // return res?.data.usersByOwner.items[0];
    return
  }
  

  async save(user: any) {
    
    let res = user;
    if (user.id) {
      const { owner = '', ...ownerLess} = user;
      res = await this.updateUser(ownerLess);
    } else {
      let { id = '', ...userToSave } = user;
     res = await this.createUser(userToSave);
    }
    this.user.next(res);
  }

  async updateUser(user: any) {
    // const client = generateClient({ authMode: 'userPool' });
    // let res;
    // try {
    //   res = (await client.graphql({
    //     query: updateUserSlim,
    //     variables: {
    //       input: user
    //     }
    //   })).data.updateUser;
    // } catch (error) {
    //   console.error(error);
    // }
    // return res;
  }

  async createUser(user: any) {
    const client = generateClient({ authMode: 'userPool' });
    // let res;
    // const owner = (await this.authService.getCurrentUser()).userId;
    // user.owner = owner;
    // try {
    //   res = (await client.graphql({
    //     query: createUserSlim,
    //     variables: {
    //       input: user
    //     }

    //   })).data.createUser;
    // } catch (error) {
    //   console.log(error);
    // }
    // return res;
  }
}
