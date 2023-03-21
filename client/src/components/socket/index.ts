import { io } from 'socket.io-client';

// "undefined" means the URL will be computed from the `window.location` object
const URL = 'http://localhost:4555';

export const socket = io(URL);
