import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

const QUESTIONS_COLLECTION = "questions";
const ANSWERS_COLLECTION = "answers";

// Question interface matching EXACT Firestore structure
export interface Question {
  id: string;
  question: string;
  details: string;
  userId: string;
  createdAt: Timestamp | any;
  score?: number;
  upvotes?: number;
  userVote?: "up" | "down" | null;
}

// Answer interface matching EXACT Firestore structure
export interface Answer {
  id: string;
  text: string;
  userId: string;
  createdAt: Timestamp | any;
  questionId: string;
}

// Create a new question
export async function createQuestion(
  question: string,
  details: string,
  userId: string
): Promise<string> {
  try {
    const questionDoc = {
      question,
      details,
      userId,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, QUESTIONS_COLLECTION), questionDoc);
    return docRef.id;
  } catch (error) {
    console.error("Error creating question:", error);
    throw error;
  }
}

// Get all questions
export async function getQuestions(): Promise<Question[]> {
  try {
    const q = query(
      collection(db, QUESTIONS_COLLECTION),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Question[];
  } catch (error: any) {
    if (error?.code === "permission-denied" || error?.message?.includes("Missing or insufficient permissions")) {
      console.log("Firebase unavailable for questions, returning empty array");
      return [];
    }
    console.error("Error fetching questions:", error);
    return [];
  }
}

// Get a single question by ID
export async function getQuestionById(questionId: string): Promise<Question | null> {
  try {
    const docRef = doc(db, QUESTIONS_COLLECTION, questionId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as Question;
    }
    return null;
  } catch (error: any) {
    if (error?.code === "permission-denied" || error?.message?.includes("Missing or insufficient permissions")) {
      console.log("Firebase unavailable for question detail, returning null");
      return null;
    }
    console.error("Error fetching question:", error);
    return null;
  }
}

// Delete a question
export async function deleteQuestion(questionId: string, userId: string): Promise<void> {
  try {
    const questionRef = doc(db, QUESTIONS_COLLECTION, questionId);
    const questionDoc = await getDoc(questionRef);

    if (!questionDoc.exists()) {
      throw new Error("Question not found");
    }

    if (questionDoc.data().userId !== userId) {
      throw new Error("Unauthorized to delete this question");
    }

    await deleteDoc(questionRef);
  } catch (error) {
    console.error("Error deleting question:", error);
    throw error;
  }
}

// Add an answer to a question
export async function addAnswer(
  text: string,
  userId: string,
  questionId: string
): Promise<string> {
  try {
    const answerDoc = {
      text,
      userId,
      questionId,
      createdAt: Timestamp.now(),
    };

    const answerRef = await addDoc(collection(db, ANSWERS_COLLECTION), answerDoc);
    return answerRef.id;
  } catch (error) {
    console.error("Error adding answer:", error);
    throw error;
  }
}

// Get answers for a question
export async function getAnswers(questionId: string): Promise<Answer[]> {
  try {
    const q = query(
      collection(db, ANSWERS_COLLECTION),
      where("questionId", "==", questionId),
      orderBy("createdAt", "asc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Answer[];
  } catch (error: any) {
    if (error?.code === "permission-denied" || error?.message?.includes("Missing or insufficient permissions")) {
      console.log("Firebase unavailable for answers, returning empty array");
      return [];
    }
    console.error("Error fetching answers:", error);
    return [];
  }
}

// Get questions by user
export async function getQuestionsByUser(userId: string): Promise<Question[]> {
  try {
    const q = query(
      collection(db, QUESTIONS_COLLECTION),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Question[];
  } catch (error: any) {
    if (error?.code === "permission-denied" || error?.message?.includes("Missing or insufficient permissions")) {
      console.log("Firebase unavailable for user questions, returning empty array");
      return [];
    }
    console.error("Error fetching user questions:", error);
    return [];
  }
}

// Get answers by user
export async function getAnswersByUser(userId: string): Promise<Answer[]> {
  try {
    const q = query(
      collection(db, ANSWERS_COLLECTION),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Answer[];
  } catch (error: any) {
    if (error?.code === "permission-denied" || error?.message?.includes("Missing or insufficient permissions")) {
      console.log("Firebase unavailable for user answers, returning empty array");
      return [];
    }
    console.error("Error fetching user answers:", error);
    return [];
  }
}

// Delete an answer
export async function deleteAnswer(answerId: string, userId: string): Promise<void> {
  try {
    const answerRef = doc(db, ANSWERS_COLLECTION, answerId);
    const answerDoc = await getDoc(answerRef);

    if (!answerDoc.exists()) {
      throw new Error("Answer not found");
    }

    if (answerDoc.data().userId !== userId) {
      throw new Error("Unauthorized to delete this answer");
    }

    await deleteDoc(answerRef);
  } catch (error) {
    console.error("Error deleting answer:", error);
    throw error;
  }
}
