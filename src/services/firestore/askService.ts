import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  getDocs,
  getDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../../config/firebase';

export interface AskPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  question: string;
  description: string;
  tags?: string[];
  upvotes: number;
  answerCount: number;
  hasAcceptedAnswer: boolean;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface Answer {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  answer: string;
  upvotes: number;
  isAccepted: boolean;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export const askService = {
  // Create question
  async createQuestion(data: {
    question: string;
    description: string;
    tags?: string[];
  }): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be signed in to ask a question');

    const questionData = {
      userId: user.uid,
      userName: user.displayName || 'Anonymous',
      userAvatar: user.photoURL || null,
      question: data.question,
      description: data.description,
      tags: data.tags || [],
      upvotes: 0,
      answerCount: 0,
      hasAcceptedAnswer: false,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'questions'), questionData);
    return docRef.id;
  },

  // Get all questions ordered by createdAt desc
  async getQuestions(): Promise<AskPost[]> {
    const q = query(collection(db, 'questions'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as AskPost[];
  },

  // Get question by ID
  async getQuestionById(questionId: string): Promise<AskPost | null> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be signed in to read questions');

    const docRef = doc(db, 'questions', questionId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as AskPost;
  },

  // Update question (only by owner)
  async updateQuestion(
    questionId: string,
    data: {
      question?: string;
      description?: string;
      tags?: string[];
    }
  ): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be signed in to update a question');

    const docRef = doc(db, 'questions', questionId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) throw new Error('Question not found');
    if (docSnap.data().userId !== user.uid) {
      throw new Error('You can only edit your own questions');
    }

    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },

  // Delete question (admin only)
  async deleteQuestion(questionId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be signed in to delete a question');

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const isAdmin = userDoc.exists() && userDoc.data().role === 'admin';

    if (!isAdmin) throw new Error('Only admins can delete questions');

    await deleteDoc(doc(db, 'questions', questionId));
  },

  // Upvote question
  async upvoteQuestion(questionId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be signed in to upvote');

    const docRef = doc(db, 'questions', questionId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) throw new Error('Question not found');

    const currentUpvotes = docSnap.data().upvotes || 0;
    await updateDoc(docRef, {
      upvotes: currentUpvotes + 1,
    });
  },

  // === ANSWERS ===

  // Create answer
  async createAnswer(questionId: string, answerText: string): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be signed in to answer');

    const answerData = {
      userId: user.uid,
      userName: user.displayName || 'Anonymous',
      userAvatar: user.photoURL || null,
      answer: answerText,
      upvotes: 0,
      isAccepted: false,
      createdAt: serverTimestamp(),
    };

    const answersRef = collection(db, 'questions', questionId, 'answers');
    const docRef = await addDoc(answersRef, answerData);

    // Update answer count on question
    const questionRef = doc(db, 'questions', questionId);
    const questionSnap = await getDoc(questionRef);
    if (questionSnap.exists()) {
      const currentCount = questionSnap.data().answerCount || 0;
      await updateDoc(questionRef, {
        answerCount: currentCount + 1,
      });
    }

    return docRef.id;
  },

  // Get answers for a question ordered by createdAt asc
  async getAnswers(questionId: string): Promise<Answer[]> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be signed in to read answers');

    const answersRef = collection(db, 'questions', questionId, 'answers');
    const q = query(answersRef, orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Answer[];
  },

  // Update answer (only by owner)
  async updateAnswer(
    questionId: string,
    answerId: string,
    answerText: string
  ): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be signed in to update an answer');

    const answerRef = doc(db, 'questions', questionId, 'answers', answerId);
    const answerSnap = await getDoc(answerRef);

    if (!answerSnap.exists()) throw new Error('Answer not found');
    if (answerSnap.data().userId !== user.uid) {
      throw new Error('You can only edit your own answers');
    }

    await updateDoc(answerRef, {
      answer: answerText,
      updatedAt: serverTimestamp(),
    });
  },

  // Delete answer (admin only)
  async deleteAnswer(questionId: string, answerId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be signed in to delete an answer');

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const isAdmin = userDoc.exists() && userDoc.data().role === 'admin';

    if (!isAdmin) throw new Error('Only admins can delete answers');

    await deleteDoc(doc(db, 'questions', questionId, 'answers', answerId));

    // Update answer count
    const questionRef = doc(db, 'questions', questionId);
    const questionSnap = await getDoc(questionRef);
    if (questionSnap.exists()) {
      const currentCount = questionSnap.data().answerCount || 0;
      await updateDoc(questionRef, {
        answerCount: Math.max(0, currentCount - 1),
      });
    }
  },

  // Accept answer (only by question owner)
  async acceptAnswer(questionId: string, answerId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be signed in');

    const questionRef = doc(db, 'questions', questionId);
    const questionSnap = await getDoc(questionRef);

    if (!questionSnap.exists()) throw new Error('Question not found');
    if (questionSnap.data().userId !== user.uid) {
      throw new Error('Only the question owner can accept an answer');
    }

    // Mark this answer as accepted
    const answerRef = doc(db, 'questions', questionId, 'answers', answerId);
    await updateDoc(answerRef, {
      isAccepted: true,
    });

    // Update question to show it has an accepted answer
    await updateDoc(questionRef, {
      hasAcceptedAnswer: true,
    });
  },

  // Upvote answer
  async upvoteAnswer(questionId: string, answerId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be signed in to upvote');

    const answerRef = doc(db, 'questions', questionId, 'answers', answerId);
    const answerSnap = await getDoc(answerRef);

    if (!answerSnap.exists()) throw new Error('Answer not found');

    const currentUpvotes = answerSnap.data().upvotes || 0;
    await updateDoc(answerRef, {
      upvotes: currentUpvotes + 1,
    });
  },
};
