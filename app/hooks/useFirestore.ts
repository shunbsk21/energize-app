import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, Query, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useFirestoreCollection<T>(collectionPath: string, orderByField?: string, direction: 'asc' | 'desc' = 'desc'): { data: T[], loading: boolean } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!collectionPath) {
      setLoading(false);
      return;
    }
    
    let q: Query<DocumentData>;
    const collectionRef = collection(db, collectionPath);

    if (orderByField) {
      q = query(collectionRef, orderBy(orderByField, direction));
    } else {
      q = query(collectionRef);
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as T));
      setData(items);
      setLoading(false);
    }, (error) => {
      console.error(`Error fetching collection ${collectionPath}:`, error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionPath, orderByField, direction]);

  return { data, loading };
}
