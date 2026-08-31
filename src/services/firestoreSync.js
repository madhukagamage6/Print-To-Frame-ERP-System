/**
 * ============================================================
 * Print To Frame ERP — Firestore Sync Service
 * ============================================================
 * Centralized CRUD operations and real-time listeners for all
 * business data collections. Replaces localStorage-based storage
 * with Firestore for multi-user real-time sync.
 */

import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

// ── Collection Names ─────────────────────────────────────────
export const COLLECTIONS = {
  LEADS: 'leads',
  CUSTOMERS: 'customers',
  PARTNERS: 'partners',
  PARTNER_APPLICATIONS: 'partner_applications',
  PARTNER_PAYOUTS: 'partner_payouts',
  PROJECTS: 'projects',
  LOGISTICS: 'logistics',
  INVOICES: 'invoices',
  QUOTATIONS: 'quotations',
  MESSAGES: 'messages',
  AUDIT_LOG: 'auditLog',
  USERS: 'users',
  PENDING_USERS: 'pendingUsers',
  SETTINGS: 'settings',
};

// ── Subscribe to a Collection (Real-time) ────────────────────
/**
 * Subscribe to real-time updates on a Firestore collection.
 * @param {string} collectionName - Name of the Firestore collection
 * @param {function} callback - Called with array of documents on each update
 * @param {function} onError - Called if the listener encounters an error
 * @returns {function} unsubscribe function
 */
export function subscribeToCollection(collectionName, callback, onError) {
  const colRef = collection(db, collectionName);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const docs = [];
      snapshot.forEach((docSnap) => {
        docs.push({ _firestoreId: docSnap.id, ...docSnap.data() });
      });
      callback(docs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, collectionName);
      if (onError) onError(error);
    }
  );
}

// ── Subscribe to a Query (Real-time) ─────────────────────────
/**
 * Subscribe to real-time updates based on a Firestore query.
 * @param {import('firebase/firestore').Query} q - A Firestore query object
 * @param {function} callback - Called with array of documents on each update
 * @param {function} onError - Called if the listener encounters an error
 * @returns {function} unsubscribe function
 */
export function subscribeToQuery(q, callback, onError) {
  return onSnapshot(
    q,
    (snapshot) => {
      const docs = [];
      snapshot.forEach((docSnap) => {
        docs.push({ _firestoreId: docSnap.id, ...docSnap.data() });
      });
      callback(docs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'query');
      if (onError) onError(error);
    }
  );
}

// ── Add Document ─────────────────────────────────────────────
/**
 * Add a new document to a collection.
 * @param {string} collectionName
 * @param {object} data
 * @param {string} [customId] - Optional custom document ID
 * @returns {Promise<string>} The document ID
 */
export async function addDocument(collectionName, data, customId) {
  try {
    const docData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (customId) {
      await setDoc(doc(db, collectionName, customId), docData);
      return customId;
    }

    const docRef = await addDoc(collection(db, collectionName), docData);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, collectionName);
    throw error;
  }
}

// ── Update Document ──────────────────────────────────────────
/**
 * Update fields on an existing document.
 * @param {string} collectionName
 * @param {string} docId - The Firestore document ID
 * @param {object} data - Fields to update
 */
export async function updateDocument(collectionName, docId, data) {
  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${docId}`);
    throw error;
  }
}

// ── Set Document (Create or Overwrite) ───────────────────────
/**
 * Set a document (creates or overwrites).
 * @param {string} collectionName
 * @param {string} docId
 * @param {object} data
 * @param {boolean} merge - If true, merges with existing data
 */
export async function setDocument(collectionName, docId, data, merge = false) {
  try {
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    }, { merge });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${docId}`);
    throw error;
  }
}

// ── Delete Document ──────────────────────────────────────────
/**
 * Delete a document from a collection.
 * @param {string} collectionName
 * @param {string} docId
 */
export async function deleteDocument(collectionName, docId) {
  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${docId}`);
    throw error;
  }
}

// ── Batch Operations ─────────────────────────────────────────
/**
 * Perform multiple write operations atomically.
 * @param {Array<{type: 'set'|'update'|'delete', collection: string, docId: string, data?: object}>} operations
 */
export async function batchWrite(operations) {
  const batch = writeBatch(db);

  for (const op of operations) {
    const docRef = doc(db, op.collection, op.docId);
    switch (op.type) {
      case 'set':
        batch.set(docRef, { ...op.data, updatedAt: serverTimestamp() });
        break;
      case 'update':
        batch.update(docRef, { ...op.data, updatedAt: serverTimestamp() });
        break;
      case 'delete':
        batch.delete(docRef);
        break;
    }
  }

  await batch.commit();
}

// ── Generate Sequential ID ──────────────────────────────────
/**
 * Generate a sequential business ID (e.g., L-004, INV-1002, J-24-003).
 * @param {string} prefix - e.g., "L", "INV", "J-24"
 * @param {Array} existingDocs - Current documents array
 * @param {string} idField - The field name containing the ID (default: "id")
 * @returns {string} The next sequential ID
 */
export function generateSequentialId(prefix, existingDocs, idField = 'id') {
  let maxNum = 0;

  for (const d of existingDocs) {
    const id = d[idField];
    if (!id || typeof id !== 'string') continue;
    // Extract the numeric part after the last dash
    const parts = id.split('-');
    const numPart = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(numPart) && numPart > maxNum) {
      maxNum = numPart;
    }
  }

  const nextNum = maxNum + 1;
  const padLength = prefix === 'INV' ? 4 : 3;
  return `${prefix}-${String(nextNum).padStart(padLength, '0')}`;
}
