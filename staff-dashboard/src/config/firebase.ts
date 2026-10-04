import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDW0i6ltzC2y_q7VkTpcJQJhGY2eR4Jk1Q',
  appId: '1:394171734508:web:e6260944d18b516fb2c8c9',
  messagingSenderId: '394171734508',
  projectId: 'serve-night-canteen-7a4ea',
  authDomain: 'serve-night-canteen-7a4ea.firebaseapp.com',
  storageBucket: 'serve-night-canteen-7a4ea.firebasestorage.app',
  measurementId: 'G-L7VWZ5H1W6',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
