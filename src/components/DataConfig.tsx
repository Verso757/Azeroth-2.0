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
  selectedGuild?: string;
}

export default function DataConfig({ collectionName, title, fields = [], parentCollection, selectedGuild }: DataConfigProps) {
  const { profile } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [parentData, setParentData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newItem, setNewItem] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!profile) return;
    const currentGuild = selectedGuild || profile.guildId;
    
    // Parent Data Load if needed
    if (parentCollection) {
      const qParent = query(collection(db, parentCollection.name), where('guildId', '==', currentGuild));
      const unSubParent = onSnapshot(qParent, (snap) => {
        setParentData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unSubParent();
    }
  }, [profile, parentCollection, selectedGuild]);

  useEffect(() => {
    if (!profile) return;
    const currentGuild = selectedGuild || profile.guildId;
    
    let q = query(collection(db, collectionName), where('guildId', '==', currentGuild));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      console.warn(error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [profile, collectionName, selectedGuild]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const currentGuild = selectedGuild || profile.guildId;
    
    setSubmitting(true);
    try {
      await addDoc(collection(db, collectionName), {
        ...newItem,
        guildId: currentGuild,
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
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-5 overflow-hidden">
      <h3 className="text-sm font-black uppercase text-slate-800 mb-3 tracking-tight">{title}</h3>
      
      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2 mb-4">
        {fields.map(f => (
          <div key={f.name} className="flex-1 min-w-0">
            {f.type === 'select' ? (
              <select
                required
                value={newItem[f.name] || ''}
                onChange={e => setNewItem(prev => ({...prev, [f.name]: e.target.value}))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-primary-500"
              >
                <option value="">{f.label}</option>
                {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input
                required
                type="text"
                placeholder={f.label}
                value={newItem[f.name] || ''}
                onChange={e => setNewItem(prev => ({...prev, [f.name]: e.target.value}))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-primary-500"
              />
            )}
          </div>
        ))}
        {parentCollection && (
          <div className="flex-1 min-w-0">
            <select
              required
              value={newItem[parentCollection.localField] || ''}
              onChange={e => setNewItem(prev => ({...prev, [parentCollection.localField]: e.target.value}))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-primary-500"
            >
              <option value="">{parentCollection.docNameField}</option>
              {parentData.map(p => <option key={p.id} value={p.id}>{p[parentCollection.parentField]}</option>)}
            </select>
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="bg-primary-600 hover:bg-primary-700 text-white rounded-xl px-4 py-1.5 font-black text-xs transition-colors flex items-center justify-center shrink-0 w-full sm:w-auto"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center p-2"><Loader2 className="w-5 h-5 animate-spin text-primary-500" /></div>
      ) : (
        <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
          {data.map(item => (
            <div key={item.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
              <div className="truncate pr-2">
                <span className="font-bold tracking-tight text-slate-800 text-xs block truncate">{item.name}</span>
                {parentCollection && item[parentCollection.localField] && (
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block truncate mt-0.5">
                    {parentData.find(p => p.id === item[parentCollection.localField])?.[parentCollection.parentField] || 'Desconocido'}
                  </span>
                )}
                {fields.filter(f => f.name !== 'name' && f.type !== 'select').map(f => (
                   <span key={f.name} className="text-[10px] text-slate-500 block truncate mt-0.5">{f.label}: {item[f.name]}</span>
                ))}
                {fields.filter(f => f.name !== 'name' && f.type === 'select').map(f => (
                   <span key={f.name} className="text-[10px] font-bold text-slate-500 block truncate mt-0.5">{f.options?.find(o => o.value === item[f.name])?.label || item[f.name]}</span>
                ))}
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {data.length === 0 && <div className="text-center text-xs font-bold text-slate-400 py-3">Sin registros</div>}
        </div>
      )}
    </div>
  );
}
