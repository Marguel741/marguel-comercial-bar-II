import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const prodConfig = {
  apiKey: "AIzaSyAgjxTNrME13qW_BsieJ6nziY9_2yDsxPU",
  authDomain: "marguel-mobile-ii.firebaseapp.com",
  projectId: "marguel-mobile-ii",
  storageBucket: "marguel-mobile-ii.firebasestorage.app",
  messagingSenderId: "187367850278",
  appId: "1:187367850278:web:ebbb3d5d1329b3eae2c1e7"
};

const testConfig = {
  apiKey: "AIzaSyDxkY-10uAvOwt6u7X74NNRB14PP3UET24",
  authDomain: "marguel-mobile-test.firebaseapp.com",
  projectId: "marguel-mobile-test",
  storageBucket: "marguel-mobile-test.firebasestorage.app",
  messagingSenderId: "919558904555",
  appId: "1:919558904555:web:9e5ae1f3928c45f5693cae"
};

const isProd = import.meta.env.VITE_ENV === 'production';
const app = initializeApp(isProd ? prodConfig : testConfig);

export const db = getFirestore(app);
