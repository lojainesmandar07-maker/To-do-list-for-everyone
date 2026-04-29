import { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, query, where, QuerySnapshot, DocumentData, serverTimestamp } from 'firebase/firestore';

export function useFirestoreCollection<T>(path: string, validator?: (data: any) => boolean) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    const ref = collection(db, path);
    const q = query(ref, where('userId', '==', auth.currentUser.uid));

    const unsub = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any;
      setData(items);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    });

    return unsub;
  }, [path]);

  return [data, loading] as const;
}

export function useGlobalAssets(type: 'character' | 'clothing' | 'decal') {
  const [assets, setAssets] = useState<any[]>([]);
  useEffect(() => {
    const ref = collection(db, 'globalAssets');
    const q = query(ref, where('type', '==', type));
    const unsub = onSnapshot(q, (snapshot) => {
      setAssets(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'globalAssets'));
    return unsub;
  }, [type]);

  const addGlobalAsset = async (url: string, config?: { characterId?: string, x?: number, y?: number, width?: number, category?: string }) => {
    if (!auth.currentUser) return;
    try {
      const data: any = {
        type,
        url,
        createdAt: serverTimestamp(),
      };
      if (config) {
        if (config.characterId !== undefined) data.characterId = config.characterId;
        if (config.x !== undefined) data.x = config.x;
        if (config.y !== undefined) data.y = config.y;
        if (config.width !== undefined) data.width = config.width;
        if (config.category !== undefined) data.category = config.category;
      }
      await setDoc(doc(collection(db, 'globalAssets')), data);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'globalAssets');
    }
  };
  
  const removeGlobalAsset = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'globalAssets', id));
    } catch(e) {
      handleFirestoreError(e, OperationType.DELETE, `globalAssets/${id}`);
    }
  }

  return { assets, addGlobalAsset, removeGlobalAsset };
}
export function useFirestoreSettings() {
  const [settings, setSettings] = useState<any>({});
  
  useEffect(() => {
    if (!auth.currentUser) return;
    const ref = doc(db, `users/${auth.currentUser.uid}/settings/profile`);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setSettings(snap.data());
      } else {
        // Initialize
        setDoc(ref, { 
          userId: auth.currentUser.uid, 
          fontMode: 'Dark',
          avatarUrl: '',
          customBgUrl: '',
          signBgUrl: '',
          boardBgUrl: ''
        }).catch(e => handleFirestoreError(e, OperationType.CREATE, ref.path));
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, ref.path);
    });
    return unsub;
  }, []);

  const updateSetting = async (key: string, value: any) => {
    if (!auth.currentUser) return;
    const ref = doc(db, `users/${auth.currentUser.uid}/settings/profile`);
    try {
      await updateDoc(ref, { [key]: value });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, ref.path);
    }
  };

  return [settings, updateSetting] as const;
}
