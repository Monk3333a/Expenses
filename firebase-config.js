// Firebase Configuration for INR Family Expense Tracker
// Replace these values with your actual Firebase project config

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

// TODO: Replace with your Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyAdIdJhvPOIQ6F9X9WNYZyqpZWomVYJ-FU",
    authDomain: "expense-tracker-e3d7f.firebaseapp.com",
    projectId: "expense-tracker-e3d7f",
    storageBucket: "expense-tracker-e3d7f.firebasestorage.app",
    messagingSenderId: "511973460480",
    appId: "1:511973460480:web:be64d3ffb78467258f66e5",
    measurementId: "G-6VEG1531RJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

console.log('Firebase initialized for INR expense tracker');