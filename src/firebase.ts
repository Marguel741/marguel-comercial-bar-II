import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const isProd = import.meta.env.VITE_ENV === 'production';

const prodConfig = {
  // as tuas credenciais actuais do marguel-mobile-ii
};

const testConfig = {
  apiKey: "AIzaSyDxkY-10uAvOwt6u7X74NNRB14PP3UET24",
  authDomain: "marguel-mobile-test.firebaseapp.com",
  projectId: "marguel-mobile-test",
  storageBucket: "marguel-mobile-test.firebasestorage.app",
  messagingSenderId: "919558904555",
  appId: "1:919558904555:web:9e5ae1f3928c45f5693cae"
};

const app = initializeApp(isProd ? prodConfig : testConfig);
export const db = getFirestore(app);
