// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, collection, addDoc, getDocs, doc, updateDoc, query, where 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Suas chaves reais do projeto MonAnki
const firebaseConfig = {
  apiKey: "AIzaSyBUz32ZDGV_fK8zZQo6odoM7z2bA4EgtX8",
  authDomain: "monanki.firebaseapp.com",
  databaseURL: "https://monanki-default-rtdb.firebaseio.com",
  projectId: "monanki",
  storageBucket: "monanki.firebasestorage.app",
  messagingSenderId: "514822463108",
  appId: "1:514822463108:web:c9e05674fadad38c1a6cd1",
  measurementId: "G-PBQRWPCVJ7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Funções de Autenticação
export const registerUser = (email, password) => createUserWithEmailAndPassword(auth, email, password);
export const loginUser = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logoutUser = () => signOut(auth);
export const listenAuth = (callback) => onAuthStateChanged(auth, callback);

// Funções de Banco de Dados (Cards)
export async function createCardInDB(userId, cardData) {
  return await addDoc(collection(db, "cards"), {
    userId,
    ...cardData,
    createdAt: new Date().toISOString()
  });
}

export async function fetchAllUserCardsFromDB(userId) {
  const q = query(collection(db, "cards"), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  const cards = [];
  querySnapshot.forEach((doc) => cards.push({ id: doc.id, ...doc.data() }));
  return cards;
}

export async function updateCardFSRSInDB(cardId, newFsrsState) {
  const cardRef = doc(db, "cards", cardId);
  await updateDoc(cardRef, { fsrs: newFsrsState });
}
