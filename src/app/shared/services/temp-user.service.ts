import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TempUserService {

  user = new BehaviorSubject<any>(null);

  constructor() { }

  userShared() {
    return this.user;
  }

  setUser(user: any) {
    this.user.next(user);
  }

  getUser() {
    return this.user.getValue();
  }


}
