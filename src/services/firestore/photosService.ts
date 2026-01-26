import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  getDocs,
  getDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, auth, storage } from '../../config/firebase';

export interface Photo {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  imageUrl: string;
  caption: string;
  location?: string;
  tags?: string[];
  upvotes: number;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export const photosService = {
  // Upload photo to Firebase Storage (returns storagePath)
  async uploadPhoto(uri: string, userId: string, postId: string): Promise<{ downloadUrl: string; storagePath: string }> {
    const response = await fetch(uri);
    const blob = await response.blob();

    const storagePath = `stories/${userId}/${postId}/${Date.now()}.jpg`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, blob);

    const downloadUrl = await getDownloadURL(storageRef);
    return { downloadUrl, storagePath };
  },

  // Create photo post
  async createPhoto(data: {
    imageUri: string;
    caption: string;
    location?: string;
    tags?: string[];
  }): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be signed in to upload a photo');

    // Create document first to get ID
    const photoData = {
      userId: user.uid,
      ownerUid: user.uid, // Consistent owner field for rules
      userName: user.displayName || 'Anonymous',
      userAvatar: user.photoURL || null,
      imageUrl: '', // Will be updated after upload
      storagePath: '', // Will be updated after upload
      caption: data.caption,
      location: data.location || '',
      tags: data.tags || [],
      upvotes: 0,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'stories'), photoData);

    // Upload image to Storage with owner-scoped path
    const storagePath = `stories/${user.uid}/${docRef.id}/${Date.now()}.jpg`;
    const response = await fetch(data.imageUri);
    const blob = await response.blob();
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, blob);
    const imageUrl = await getDownloadURL(storageRef);

    // Update document with image URL and storage path
    await updateDoc(docRef, { imageUrl, storagePath });

    return docRef.id;
  },

  // Get all stories ordered by createdAt desc (Grid view)
  async getPhotos(): Promise<Photo[]> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be signed in to view stories');

    const q = query(collection(db, 'stories'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Photo[];
  },

  // Get stories by user (Detail view)
  async getPhotosByUser(userId: string): Promise<Photo[]> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be signed in to view stories');

    const q = query(
      collection(db, 'stories'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Photo[];
  },

  // Get photo by ID
  async getPhotoById(photoId: string): Promise<Photo | null> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be signed in to view stories');

    const docRef = doc(db, 'stories', photoId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as Photo;
  },

  // Update photo (only by owner)
  async updatePhoto(
    photoId: string,
    data: {
      caption?: string;
      location?: string;
      tags?: string[];
    }
  ): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be signed in to update a photo');

    const docRef = doc(db, 'stories', photoId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) throw new Error('Photo not found');
    if (docSnap.data().userId !== user.uid) {
      throw new Error('You can only edit your own stories');
    }

    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },

  // Delete photo (owner OR admin)
  async deletePhoto(photoId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be signed in to delete a photo');

    // Get photo doc to check ownership and get storage path
    const photoDocRef = doc(db, 'stories', photoId);
    const photoDoc = await getDoc(photoDocRef);
    
    if (!photoDoc.exists()) {
      throw new Error('Photo not found');
    }
    
    const photoData = photoDoc.data();
    const ownerId = photoData.userId;

    // Check if user is owner
    const isOwner = ownerId === user.uid;

    // Check if user is admin
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const isAdmin = userDoc.exists() && (
      userDoc.data().role === 'admin' || 
      userDoc.data().role === 'administrator' ||
      userDoc.data().isAdmin === true
    );

    if (!isOwner && !isAdmin) {
      throw new Error('You can only delete your own photos or must be an admin');
    }

    // Delete from Storage using stored path or construct it
    const storagePath = photoData.storagePath;
    if (storagePath) {
      try {
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);
        console.log('[photosService] Deleted from Storage:', storagePath);
      } catch (storageError: any) {
        // Log but continue - the file might already be deleted or path was wrong
        console.warn('[photosService] Storage delete error (continuing):', storageError?.message || storageError);
      }
    } else {
      // Fallback: try to delete using constructed path pattern
      // Pattern: stories/{userId}/{photoId}/*.jpg
      try {
        // Try common patterns
        const patterns = [
          `stories/${ownerId}/${photoId}.jpg`,
          `stories/${ownerId}/${photoId}/${photoId}.jpg`,
        ];
        
        for (const pattern of patterns) {
          try {
            const storageRef = ref(storage, pattern);
            await deleteObject(storageRef);
            console.log('[photosService] Deleted from Storage (fallback):', pattern);
            break;
          } catch {
            // Try next pattern
          }
        }
      } catch (storageError: any) {
        console.warn('[photosService] Fallback storage delete error:', storageError?.message || storageError);
      }
    }

    // Delete from Firestore
    await deleteDoc(photoDocRef);
    console.log('[photosService] Successfully deleted photo:', photoId);
  },

  // Upvote photo
  async upvotePhoto(photoId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be signed in to upvote');

    const docRef = doc(db, 'stories', photoId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) throw new Error('Photo not found');

    const currentUpvotes = docSnap.data().upvotes || 0;
    await updateDoc(docRef, {
      upvotes: currentUpvotes + 1,
    });
  },
};
