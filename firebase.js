// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, collection, addDoc, getDocs, doc, updateDoc, query, where 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const registerUser = (email, password) => createUserWithEmailAndPassword(auth, email, password);
export const loginUser = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logoutUser = () => signOut(auth);
export const listenAuth = (callback) => onAuthStateChanged(auth, callback);

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
