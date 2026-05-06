import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, deleteDoc, doc, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { OperationType } from '../types';
import { handleFirestoreError } from '../constants';
import { Plus, Trash2, Loader2, Database, MapPin, Route, Tags, Tag, MonitorSmartphone } from 'lucide-react';
import { cn } from '../lib/utils';

interface DataConfigProps {
  collectionName: string;
  title: string;
  fields?: { name: string; label: string; type?: 'text' | 'select'; options?: {value:string, label:string}[] }[];
  parentCollection?: { name: string; localField: string; parentField: string; docNameField: string };
  selectedGuild?: string;
}

const getIconForCollection = (name: string) => {
  switch (name) {
    case 'cities': return <MapPin className="w-5 h-5" />;
    case 'routes': return <Route className="w-5 h-5" />;
    case 'categories': return <Tags className="w-5 h-5" />;
    case 'motifs': return <Tag className="w-5 h-5" />;
    case 'brands': return <MonitorSmartphone className="w-5 h-5" />;
    default: return <Database className="w-5 h-5" />;
  }
};

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
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-6 md:p-8 flex flex-col h-full relative overflow-hidden">
      {/* Decorative gradient corner */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-50/50 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center gap-4 mb-6 relative z-10">
        <div className="w-14 h-14 rounded-[1.25rem] bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-inner shrink-0">
          {getIconForCollection(collectionName)}
        </div>
        <div>
          <h3 className="text-lg font-black uppercase text-slate-900 tracking-tight">{title}</h3>
          <p className="text-xs text-slate-500 font-medium">Gestión de registros</p>
        </div>
      </div>
      
      <form onSubmit={handleAdd} className="flex flex-col gap-3 mb-8 relative z-10">
        <div className="grid grid-cols-1 gap-3">
            {parentCollection && (
                <div className="flex-1 min-w-0">
                    <select
                    required
                    value={newItem[parentCollection.localField] || ''}
                    onChange={e => setNewItem(prev => ({...prev, [parentCollection.localField]: e.target.value}))}
                    className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border text-sm font-bold border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:border-indigo-500 transition-colors shadow-sm"
                    >
                    <option value="">{parentCollection.docNameField}</option>
                    {parentData.map(p => <option key={p.id} value={p.id}>{p[parentCollection.parentField]}</option>)}
                    </select>
                </div>
            )}
            
            {fields.map(f => (
            <div key={f.name} className="flex-1 min-w-0">
                {f.type === 'select' ? (
                <select
                    required
                    value={newItem[f.name] || ''}
                    onChange={e => setNewItem(prev => ({...prev, [f.name]: e.target.value}))}
                    className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border text-sm font-bold border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:border-indigo-500 transition-colors shadow-sm"
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
                    className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border text-sm font-bold border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:border-indigo-500 transition-colors shadow-sm placeholder:text-slate-400"
                />
                )}
            </div>
            ))}
        </div>
        
        <button
          type="submit"
          disabled={submitting}
          className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-2xl px-4 py-3.5 mt-2 font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20 disabled:opacity-70 disabled:pointer-events-none"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-2 stroke-[3]" /> Agregar Registro</>}
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center p-8 mt-auto"><Loader2 className="w-8 h-8 animate-spin text-indigo-300" /></div>
      ) : (
        <div className="flex-1 flex flex-col space-y-2.5 overflow-y-auto pr-2 custom-scrollbar min-h-[250px] relative z-10">
          {data.map(item => (
             <div key={item.id} className="group flex items-center justify-between p-4 rounded-[1.25rem] bg-white border border-slate-200 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all text-left">
                <div className="flex flex-col min-w-0 pr-4">
                  <span className="font-bold tracking-tight text-slate-800 text-sm truncate">{item.name}</span>
                  {parentCollection && item[parentCollection.localField] && (
                    <span className="text-[10px] uppercase font-black text-indigo-500 tracking-widest truncate mt-1">
                      {parentData.find(p => p.id === item[parentCollection.localField])?.[parentCollection.parentField] || 'Desconocido'}
                    </span>
                  )}
                  {fields.filter(f => f.name !== 'name' && f.type !== 'select').map(f => (
                     <span key={f.name} className="text-xs font-semibold text-slate-500 truncate mt-1">{f.label}: {item[f.name]}</span>
                  ))}
                  {fields.filter(f => f.name !== 'name' && f.type === 'select').map(f => (
                     <span key={f.name} className="text-xs font-bold text-slate-500 truncate mt-1 bg-slate-100 self-start px-2 py-0.5 rounded-lg border border-slate-200">{f.options?.find(o => o.value === item[f.name])?.label || item[f.name]}</span>
                  ))}
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0 md:opacity-0 md:-translate-x-2 md:group-hover:opacity-100 md:group-hover:translate-x-0"
                  title="Eliminar registro"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
             </div>
          ))}
          {data.length === 0 && (
             <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 h-full my-auto">
                <Database className="w-10 h-10 text-slate-300 mb-4" />
                <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Sin registros</p>
                <p className="text-xs font-medium text-slate-500 mt-2 max-w-[200px]">Usa el formulario para agregar el primer elemento a esta lista.</p>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
