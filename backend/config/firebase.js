const admin = require('firebase-admin');

// Initialize Firebase Admin
// You can use service account key file or application default credentials
try {
  if (!admin.apps.length) {
    // Option 1: Using service account key file (recommended for production)
    // Place your firebase-service-account.json in backend/config/
    // const serviceAccount = require('./firebase-service-account.json');
    // admin.initializeApp({
    //   credential: admin.credential.cert(serviceAccount)
    // });

    // Option 2: Using project ID only (works for token verification)
    // This is simpler and doesn't require service account file
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'swdproject-2d07a'
    });

    console.log('Firebase Admin initialized successfully');
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error);
}

module.exports = admin;

