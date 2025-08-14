// ملف: ./server/index.js

// استدعاء المكتبات الضرورية
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

// تهيئة تطبيق Express
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  // تفعيل CORS للسماح بالاتصال من الواجهة الأمامية
  cors: {
    origin: "*", // السماح بالاتصال من أي مصدر
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// تشغيل الخادم
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// هذا الجزء هو عقل التطبيق
// هنا سنستقبل الرسائل ونرسلها لجميع المستخدمين

// عند اتصال عميل (مستخدم) جديد
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // استقبال رسالة من العميل
  socket.on('chat message', (msg) => {
    console.log('message received:', msg);

    // إرسال الرسالة لجميع العملاء المتصلين
    io.emit('chat message', msg);
  });

  // عند انقطاع اتصال العميل
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});
