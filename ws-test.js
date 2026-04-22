// eslint-disable-next-line @typescript-eslint/no-var-requires
const { io } = require('socket.io-client');

const TOKEN = 'YOUR_JWT_TOKEN_HERE';

// ✅ Connect directly to namespace
const socket = io('http://localhost:8000/stats', {
  auth: {
    token:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YjUzYzA2Mi0zZTk1LTRkODUtYWJmOC0wY2QyYjA4MmQzNWQiLCJlbWFpbCI6Imp1c3Rhaml0MzNAZ21haWwuY29tIiwicm9sZSI6ImFkbWluIiwib3JnSWQiOiIzZjcxZDJjOC0wYTM5LTQ4N2UtYjc0ZS1jMDRlZDY0NmU3MDAiLCJpYXQiOjE3NzU3NjQ2NzYsImV4cCI6MTc3NTg1MTA3Nn0.fof8yQYGHmQeG7S-ct_3gyXgFC3EcjIyHuR4Pvwk86k',
  },
  transports: ['websocket'], // force websocket (no polling)
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
});

// ✅ On successful connection
socket.on('connect', () => {
  console.log('✅ Connected to /stats namespace');
  console.log('🆔 Socket ID:', socket.id);
});

// ✅ Listen to your backend events
socket.on('click.processed', (data) => {
  console.log('🔥 CLICK EVENT RECEIVED:');
  console.log(JSON.stringify(data, null, 2));
});

socket.on('email.sent', (data) => {
  console.log('📧 EMAIL EVENT RECEIVED:');
  console.log(JSON.stringify(data, null, 2));
});

// ✅ Debug: listen to ALL events (very useful)
socket.onAny((event, data) => {
  console.log(`📡 Event: ${event}`);
  console.log('Payload:', data);
});

// ❌ Handle disconnect
socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected:', reason);
});

// ❌ Handle connection error
socket.on('connect_error', (err) => {
  console.error(
    '🚨 Connection error:',
    err.message,
  );
});

// 🔄 Optional: manual test trigger (after 5 sec)
setTimeout(() => {
  console.log('⏳ Waiting for backend events...');
}, 5000);
