import { Observable, from, throwError, of } from 'rxjs';
import { User } from './user';
import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { AngularFireAuth } from '@angular/fire/auth';
import { switchMap, catchError, map, tap } from 'rxjs/operators'
import { auth } from 'firebase/app';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private userCollection: AngularFirestoreCollection<User> = this.afs.collection('users');

  constructor(
    private afs: AngularFirestore,
    private afAuth: AngularFireAuth
  ) { }

  register(user: User): Observable<boolean> {
    return from(this.afAuth.auth.createUserWithEmailAndPassword(user.email, user.password))
      .pipe(
        switchMap((u: firebase.auth.UserCredential) =>
          this.userCollection.doc(u.user.uid)
            .set({ ...user, id: u.user.uid })
            .then(() => true)
        ),
        catchError((err) => throwError(err))
      )
  }

  login(email: string, password: string): Observable<User> {
    return from(this.afAuth.auth.signInWithEmailAndPassword(email, password))
      .pipe(
        switchMap((u: firebase.auth.UserCredential) => this.userCollection.doc<User>(u.user.uid).valueChanges()),
        catchError(() => throwError('Invalid credentials or user is not registered.'))
      )
  }

  logout() {
    this.afAuth.auth.signOut();
  }

  getUser(): Observable<User> {
    return this.afAuth.authState
      .pipe(
        switchMap(u => (u) ?
          this.userCollection.doc<User>(u.uid).valueChanges() : of(null))
      )
  }

  authenticated(): Observable<boolean> {
    return this.afAuth.authState.pipe(map(u => (u) ? true : false))
  }

  loginGoogle(): Observable<User> {
    const provider = new auth.GoogleAuthProvider();
    return from(this.afAuth.auth.signInWithPopup(provider))
      .pipe(
        tap((data) => console.log(data)),
        switchMap((u: auth.UserCredential) => {
          const newUser: User = {
            firstname: u.user.displayName,
            lastname: '',
            address: '',
            city: '',
            state: '',
            phone: '',
            mobilephone: '',
            email: u.user.email,
            password: '',
            id: u.user.uid
          };
          return this.userCollection.doc(u.user.uid)
            .set(newUser).then(() => newUser);
        })
      );
  }
}
