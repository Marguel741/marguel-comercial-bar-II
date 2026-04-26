importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAgjxTNrME13qW_BsieJ6nziY9_2yDsxPU",
  authDomain: "marguel-mobile-ii.firebaseapp.com",
  projectId: "marguel-mobile-ii",
  storageBucket: "marguel-mobile-ii.firebasestorage.app",
  messagingSenderId: "187367850278",
  appId: "1:187367850278:web:ebbb3d5d1329b3eae2c1e7"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || 'Marguel SGI', {
    body: body || '',
    icon: icon || '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data
  });
});
