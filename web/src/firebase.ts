import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyB3_p7t72dWB02KJX0bZkiSGNuSup2w8t0',
  authDomain: 'claritydb-fa027.firebaseapp.com',
  databaseURL: 'https://claritydb-fa027-default-rtdb.firebaseio.com',
  projectId: 'claritydb-fa027',
  storageBucket: 'claritydb-fa027.firebasestorage.app',
  messagingSenderId: '1011906710854',
  appId: '1:1011906710854:web:93ed6641e803b670a26947',
  measurementId: 'G-SS1NJPLD1W',
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
export const storage = getStorage(app)