import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { env } from './src/config/env';

initializeApp({
  projectId: 'serve-night-canteen'
});

async function run() {
  try {
    const userRecord = await getAuth().getUserByEmail('serve.test@gmail.com');
    console.log('Firebase User Email:', userRecord.email);
    console.log('Firebase User UID:', userRecord.uid);
  } catch (error: any) {
    console.log('Error fetching user:', error.message);
  }
}
run();
