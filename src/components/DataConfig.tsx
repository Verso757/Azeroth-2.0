import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, deleteDoc, doc, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { OperationType } from '../types';
import { handleFirestoreError } from '../constants';
import { Plus, Trash2, Loader2 } from 'lucide-react';

interface DataConfigProps {
  collectionName: string;
  title: string;
  fields?: { name: string; label: string; type?: 'text' | 'select'; options?: {value:string, label:string}[] }[];
  parentCollection?: { name: string; localField: string; parentField: string; docNameField: string };
}

export default function DataConfig({ collectionName, title, fields = [], parentCollection }: DataConfigProps) {
  const { profile } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [parentData, setParentData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newItem, setNewItem] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!profile) return;
    const adminGuilds = profile.allowedGuilds ? [profile.guildId, ...profile.allowedGuilds] : [profile.guildId];
    
    // Parent Data Load if needed
    if (parentCollection) {
      const qParent = query(collection(db, parentCollection.name), where('guildId', 'in', adminGuilds));
      const unSubParent = onSnapshot(qParent, (snap) => {
        setParentData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unSubParent();
    }
  }, [profile, parentCollection]);

  useEffect(() => {
    if (!profile) return;
    const adminGuilds = profile.allowedGuilds ? [profile.guildId, ...profile.allowedGuilds] : [profile.guildId];
    
    let q = query(collection(db, collectionName), where('guildId', 'in', adminGuilds));
    // For routes, they don't have guildId directly in the rule, wait, yes they do? 
    // Wait, in my rule: isSameGuild(cities/cityId.guildId). 
    // To allow query on routes securely by guildId, I might need to add guildId to routes, or I just query all routes for the cities I have.
    // Let's assume all collections have guildId for easier querying.
    // Actually, earlier in firestore.rules for routes: `allow read: if isSameGuild(...)`. 
    // We should save guildId in routes too to simplify queries.
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      // If error (e.g. routes without guildId), we might need to handle differently
      console.warn(error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [profile, collectionName]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, collectionName), {
        ...newItem,
        guildId: profile.guildId,
        createdAt: serverTimestamp()
      });
      setNewItem({});
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, collectionName);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este registro?')) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, collectionName);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 overflow-hidden">
      <h3 className="text-lg font-bold text-slate-800 mb-4">{title}</h3>
      
      <form onSubmit={handleAdd} className="flex gap-2 mb-6 flex-wrap">
        {fields.map(f => (
          <div key={f.name} className="flex-1 min-w-[200px]">
            {f.type === 'select' ? (
              <select
                required
                value={newItem[f.name] || ''}
                onChange={e => setNewItem(prev => ({...prev, [f.name]: e.target.value}))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium outline-none focus:border-primary-500"
              >
                <option value="">Selecciona {f.label}</option>
                {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input
                required
                type="text"
                placeholder={f.label}
                value={newItem[f.name] || ''}
                onChange={e => setNewItem(prev => ({...prev, [f.name]: e.target.value}))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium outline-none focus:border-primary-500"
              />
            )}
          </div>
        ))}
        {parentCollection && (
          <div className="flex-1 min-w-[200px]">
            <select
              required
              value={newItem[parentCollection.localField] || ''}
              onChange={e => setNewItem(prev => ({...prev, [parentCollection.localField]: e.target.value}))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium outline-none focus:border-primary-500"
            >
              <option value="">Selecciona {parentCollection.docNameField}</option>
              {parentData.map(p => <option key={p.id} value={p.id}>{p[parentCollection.parentField]}</option>)}
            </select>
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="bg-primary-600 hover:bg-primary-700 text-white rounded-xl px-4 py-2 font-bold text-sm transition-colors flex items-center justify-center min-w-[100px]"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
          {data.map(item => (
            <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <span className="font-bold text-sm block">{item.name}</span>
                {parentCollection && item[parentCollection.localField] && (
                  <span className="text-xs text-slate-500">
                    Depende de: {parentData.find(p => p.id === item[parentCollection.localField])?.[parentCollection.parentField] || 'Desconocido'}
                  </span>
                )}
                {fields.filter(f => f.name !== 'name' && f.type !== 'select').map(f => (
                   <span key={f.name} className="text-xs text-slate-500 block">{f.label}: {item[f.name]}</span>
                ))}
                {fields.filter(f => f.name !== 'name' && f.type === 'select').map(f => (
                   <span key={f.name} className="text-xs text-slate-500 block">{f.label}: {f.options?.find(o => o.value === item[f.name])?.label || item[f.name]}</span>
                ))}
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {data.length === 0 && <div className="text-center text-sm text-slate-400 py-4">No hay registros</div>}
        </div>
      )}
    </div>
  );
}
