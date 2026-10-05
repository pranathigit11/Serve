import { io, type Socket } from 'socket.io-client';
import { firebaseAuth } from './firebase';
import { getConfig } from './config';

/**
 * Opens the authenticated realtime connection. The server decides which rooms
 * this connection joins (from the staff member's canteen assignment); the
 * client never asks for rooms. A fresh ID token is sent on every (re)connect.
 */
export function connectRealtime(): Socket {
  return io(getConfig().socketUrl, {
    transports: ['websocket', 'polling'],
    auth: (callback) => {
      const user = firebaseAuth().currentUser;
      if (!user) return callback({});
      user
        .getIdToken()
        .then((token) => callback({ token }))
        .catch(() => callback({}));
    },
  });
}
