/**
 * Questions & Answers Firestore Service
 * Collections: questions, answers
 */

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  increment,
  DocumentSnapshot,
} from "firebase/firestore";
import firebaseApp from "../config/firebase";
import { Question, Answer, QuestionStatus } from "../types/community";

const db = getFirestore(firebaseApp);

// ==================== Questions ====================

export async function getQuestions(
  filterBy?: "all" | "unanswered" | "answered" | "popular",
  userId?: string,
  limitCount: number = 20,
  lastDoc?: DocumentSnapshot
): Promise<{ questions: Question[]; lastDoc: DocumentSnapshot | null }> {
  const questionsRef = collection(db, "questions");

  let q = query(questionsRef);

  // Apply filters
  if (filterBy === "unanswered") {
    q = query(q, where("answerCount", "==", 0), orderBy("createdAt", "desc"));
  } else if (filterBy === "answered") {
    q = query(q, where("status", "==", "answered"), orderBy("lastActivityAt", "desc"));
  } else if (filterBy === "popular") {
    q = query(q, orderBy("answerCount", "desc"), orderBy("createdAt", "desc"));
  } else if (userId) {
    q = query(q, where("authorId", "==", userId), orderBy("createdAt", "desc"));
  } else {
    q = query(q, orderBy("lastActivityAt", "desc"));
  }

  q = query(q, limit(limitCount));

  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }

  const snapshot = await getDocs(q);
  const questions = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      body: data.description || data.body || data.content || '',
      content: data.description || data.content || data.body || '', // Legacy alias
    };
  }) as Question[];

  const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

  return { questions, lastDoc: lastVisible };
}

export async function getQuestionById(questionId: string): Promise<Question | null> {
  const questionRef = doc(db, "questions", questionId);
  const questionSnap = await getDoc(questionRef);

  if (!questionSnap.exists()) {
    return null;
  }

  const data = questionSnap.data();
  return {
    id: questionSnap.id,
    ...data,
    body: data.description || data.body || data.content || '',
    content: data.description || data.content || data.body || '', // Legacy alias
  } as Question;
}

export async function createQuestion(data: {
  title: string;
  body: string;
  tags: string[];
  authorId: string;
  authorHandle: string;
}): Promise<string> {
  const questionsRef = collection(db, "questions");

  const docRef = await addDoc(questionsRef, {
    title: data.title,
    body: data.body,
    tags: data.tags,
    authorId: data.authorId,
    authorHandle: data.authorHandle,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    status: "open" as QuestionStatus,
    answerCount: 0,
    viewCount: 0,
    upvotes: 0,
    lastActivityAt: serverTimestamp(),
    hasAcceptedAnswer: false,
  });

  return docRef.id;
}

export async function upvoteQuestion(questionId: string): Promise<void> {
  const questionRef = doc(db, "questions", questionId);
  await updateDoc(questionRef, {
    upvotes: increment(1),
  });
}

export async function incrementQuestionViews(questionId: string): Promise<void> {
  const questionRef = doc(db, "questions", questionId);
  await updateDoc(questionRef, {
    viewCount: increment(1),
  });
}

// ==================== Answers ====================

export async function getAnswers(
  questionId: string,
  limitCount: number = 50
): Promise<Answer[]> {
  const answersRef = collection(db, "answers");
  const q = query(
    answersRef,
    where("questionId", "==", questionId),
    orderBy("upvoteCount", "desc"),
    orderBy("createdAt", "asc"),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      body: data.text || data.body || '',
      content: data.text || data.body || '', // Legacy alias
      upvotes: data.upvoteCount || 0, // Legacy alias
    } as Answer;
  });
}

export async function createAnswer(data: {
  questionId: string;
  body: string;
  authorId: string;
  authorHandle: string;
}): Promise<string> {
  const answersRef = collection(db, "answers");

  const docRef = await addDoc(answersRef, {
    questionId: data.questionId,
    text: data.body,
    userId: data.authorId,
    username: data.authorHandle,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    helpful_count: 0,
    isAccepted: false,
  });

  // Increment answer count and update activity
  const questionRef = doc(db, "questions", data.questionId);
  await updateDoc(questionRef, {
    answerCount: increment(1),
    lastActivityAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function upvoteAnswer(answerId: string): Promise<void> {
  const answerRef = doc(db, "answers", answerId);
  await updateDoc(answerRef, {
    upvoteCount: increment(1),
  });
}

export async function acceptAnswer(
  questionId: string,
  answerId: string
): Promise<void> {
  // Mark answer as accepted
  const answerRef = doc(db, "answers", answerId);
  await updateDoc(answerRef, {
    isAccepted: true,
  });

  // Update question
  const questionRef = doc(db, "questions", questionId);
  await updateDoc(questionRef, {
    status: "answered" as QuestionStatus,
    hasAcceptedAnswer: true,
    acceptedAnswerId: answerId,
  });
}
