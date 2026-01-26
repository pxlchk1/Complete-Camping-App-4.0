/**
 * Content Reports Firestore Service
 * Collection: contentReports
 */

import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import firebaseApp from "../config/firebase";
import { ReportTargetType } from "../types/community";

const db = getFirestore(firebaseApp);

export async function reportContent(data: {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  reporterId: string;
}): Promise<string> {
  const reportsRef = collection(db, "contentReports");

  const docRef = await addDoc(reportsRef, {
    targetType: data.targetType,
    targetId: data.targetId,
    reason: data.reason,
    reporterId: data.reporterId,
    createdAt: serverTimestamp(),
    status: "open",
  });

  return docRef.id;
}
