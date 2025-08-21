/*
 * This script is for seeding the Firestore database with initial data.
 * To run this script:
 * 1. Make sure you have Firebase Admin SDK installed (`npm install firebase-admin`).
 * 2. Set up a service account in your Firebase project and download the JSON key file.
 * 3. Set the GOOGLE_APPLICATION_CREDENTIALS environment variable to the path of your key file.
 *    e.g., export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/serviceAccountKey.json"
 * 4. Run the script using node: `node src/utils/seedDatabase.js`
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// IMPORTANT: Replace this with your actual app ID from your .env file or directly.
const appId = 'default-app-id';

// Initialize Firebase Admin
// The SDK will automatically find the credentials via the GOOGLE_APPLICATION_CREDENTIALS env var.
try {
 initializeApp();
} catch (error) {
    console.log(`Firebase Admin SDK already initialized or initialization failed: ${error.message}`);
}


const db = getFirestore();

const virtualItems = [
  { id: 'bg001', name: 'Cosmic Space Background', type: 'background', price: 100, imageUrl: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1742&q=80' },
  { id: 'bg002', name: 'Peaceful Beach Background', type: 'background', price: 120, imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723a9ce6890?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80' },
  { id: 'bg003', name: 'Retro Arcade Background', type: 'background', price: 150, imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1742&q=80' },
  { id: 'mic001', name: 'Golden Microphone Skin', type: 'mic_skin', price: 50, imageUrl: 'https://via.placeholder.com/150/FFD700/000000?Text=Gold+Mic' },
  { id: 'mic002', name: 'Neon Blue Microphone Skin', type: 'mic_skin', price: 75, imageUrl: 'https://via.placeholder.com/150/00FFFF/000000?Text=Neon+Mic' },
];

async function seedDatabase() {
  console.log('Starting to seed database...');
  const collectionPath = `apps/${appId}/virtualItems`;
  const collectionRef = db.collection(collectionPath);

  for (const item of virtualItems) {
    try {
      await collectionRef.doc(item.id).set(item);
      console.log(`Successfully added item: ${item.name}`);
    } catch (error)
    {
      console.error(`Error adding item ${item.name}:`, error);
    }
  }

  console.log('Database seeding complete.');
}

seedDatabase().catch(console.error);
