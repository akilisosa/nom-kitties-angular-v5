import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';

import { generateClient } from 'aws-amplify/data';
import { Schema } from '../../../../amplify/data/resource';
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
    const client = generateClient<Schema>({ authMode: 'userPool' });
    const owner = (await this.authService.getCurrentUser()).userId;
    let res;

    try {
       res = (await client.models.User.list({
        filter: {
          owner: { eq: owner }
        }
       })).data[0] //.getByOwner({ owner });

    } catch (error) {
      console.error(error);
    }
    this.user.next(res);
    return res;

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
    return res;
  }

  async updateUser(user: any) {
    const client = generateClient<Schema>({ authMode: 'userPool' });
    let res;
    try {
      res = (await client.models.User.update(user)).data;
    } catch (error) {
      console.error(error);
    }
    return res;
  }

  async createUser(user: any) {
    const client = generateClient<Schema>({ authMode: 'userPool' });
    let res;
    try {
      res = (await client.models.User.create({...user}, {
        authMode: 'userPool'
      })).data;
    } catch (error) {
      console.error(error);
    }
    return res;
  }
}
