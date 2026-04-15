import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAgjxTNrME13qW_BsieJ6nziY9_2yDsxPU",
  authDomain: "marguel-mobile-ii.firebaseapp.com",
  projectId: "marguel-mobile-ii",
  storageBucket: "marguel-mobile-ii.firebasestorage.app",
  messagingSenderId: "187367850278",
  appId: "1:187367850278:web:ebbb3d5d1329b3eae2c1e7"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
