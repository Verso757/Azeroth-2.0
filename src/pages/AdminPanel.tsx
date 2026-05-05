import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp, setDoc, addDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Issue, OperationType, UserProfile, Area } from '../types';
import { handleFirestoreError } from '../constants';
import { ShieldCheck, MessageSquare, ArrowRight, UserCheck, Search, Users, LayoutGrid, Trash2, Plus, Settings2, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDate } from '../lib/utils';

export default function AdminPanel() {
  const { profile } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'issues' | 'users' | 'areas'>('issues');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');

  const [newAreaName, setNewAreaName] = useState('');

  useEffect(() => {
    const unsubIssues = onSnapshot(query(collection(db, 'issues'), orderBy('createdAt', 'desc')), (snapshot) => {
      setIssues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Issue[]);
      setLoading(false);
    });

    const unsubUsers = onSnapshot(query(collection(db, 'users'), orderBy('createdAt', 'desc')), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserProfile[]);
    });

    const unsubAreas = onSnapshot(query(collection(db, 'areas')), (snapshot) => {
      setAreas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Area[]);
    });

    return () => {
      unsubIssues();
      unsubUsers();
      unsubAreas();
    };
  }, []);

  const handleResolve = async (issueId: string) => {
    if (!resolutionText || !profile) return;
    
    try {
      const issueRef = doc(db, 'issues', issueId);
      await updateDoc(issueRef, {
        status: 'resolved',
        resolution: resolutionText,
        resolvedBy: profile.displayName || 'Admin',
        resolvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Add to timeline
      await addDoc(collection(db, 'issues', issueId, 'events'), {
        issueId,
        type: 'status_change',
        userId: profile.uid,
        userName: profile.displayName,
        content: `Finalizó la resolución: "${resolutionText}"`,
        createdAt: new Date().toISOString(),
      });

      setResolvingId(null);
      setResolutionText('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `issues/${issueId}`);
    }
  };

  const handleAddArea = async () => {
    if (!newAreaName) return;
    try {
      const id = newAreaName.toLowerCase().replace(/\s+/g, '-');
      await setDoc(doc(db, 'areas', id), {
        id,
        name: newAreaName,
        color: 'blue',
      });
      setNewAreaName('');
    } catch (err) {
      console.error(err);
    }
  };

  const pendingIssues = issues.filter(i => i.status === 'open' || i.status === 'in_progress');

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Control Maestro</h1>
          <p className="text-slate-500 font-medium">Gestión administrativa del núcleo Azeroth.</p>
        </div>
        
        <div className="flex bg-white rounded-2xl border border-slate-200 p-1 shadow-sm">
          <TabButton active={activeTab === 'issues'} onClick={() => setActiveTab('issues')} icon={Activity} label="Incidencias" />
          <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={Users} label="Cuentas" />
          <TabButton active={activeTab === 'areas'} onClick={() => setActiveTab('areas')} icon={LayoutGrid} label="Divisiones" />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'issues' && (
          <motion.div key="issues" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
            <div className="bg-blue-600 rounded-[3rem] p-10 text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden">
               <div className="relative z-10 space-y-2">
                 <p className="text-blue-100 font-black uppercase tracking-[0.3em] text-[10px]">Estatus de Red</p>
                 <div className="flex items-baseline gap-4">
                   <h2 className="text-6xl font-black">{pendingIssues.length}</h2>
                   <p className="text-xl font-bold opacity-80 uppercase tracking-tighter">Reportes Pendientes</p>
                 </div>
               </div>
               <ShieldCheck className="absolute top-1/2 right-10 -translate-y-1/2 w-56 h-56 text-blue-500/20" />
            </div>

            <div className="grid grid-cols-1 gap-6">
              {pendingIssues.map(issue => (
                <AdminIssueCard 
                  key={issue.id} 
                  issue={issue} 
                  resolvingId={resolvingId}
                  setResolvingId={setResolvingId}
                  resolutionText={resolutionText}
                  setResolutionText={setResolutionText}
                  onResolve={() => handleResolve(issue.id)}
                />
              ))}
              {pendingIssues.length === 0 && (
                <div className="bg-white rounded-[2.5rem] p-20 text-center border-2 border-dashed border-slate-100">
                   <CheckCircle2Icon className="w-16 h-16 text-emerald-100 mx-auto mb-6" />
                   <h3 className="text-2xl font-black text-slate-900 uppercase">Sin Pendientes</h3>
                   <p className="text-slate-400 font-medium">Todo el sistema Azeroth está operando con normalidad.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Operador</th>
                  <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Nivel de Acceso</th>
                  <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Registro</th>
                  <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Aciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map(user => (
                  <tr key={user.uid} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black uppercase shadow-sm">
                           {user.displayName?.charAt(0)}
                         </div>
                         <div>
                           <p className="text-sm font-black text-slate-900 uppercase">{user.displayName || 'Sin Nombre'}</p>
                           <p className="text-xs font-bold text-slate-400">{user.email}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <span className={cn(
                         "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                         user.role === 'admin' ? "bg-slate-900 text-white" : "bg-blue-50 text-blue-600"
                       )}>
                         {user.role}
                       </span>
                    </td>
                    <td className="px-8 py-6 text-xs font-bold text-slate-400">
                       {formatDate(user.createdAt)}
                    </td>
                    <td className="px-8 py-6 text-right">
                       <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-blue-600">
                         <Settings2 className="w-5 h-5" />
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        {activeTab === 'areas' && (
          <motion.div key="areas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row items-center gap-6 shadow-sm">
               <div className="flex-1 space-y-1">
                 <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Nueva División</h3>
                 <p className="text-sm text-slate-400 font-medium">Define una nueva área de reporte en el núcleo.</p>
               </div>
               <div className="flex gap-2 w-full md:w-auto">
                 <input 
                   type="text" 
                   value={newAreaName}
                   onChange={e => setNewAreaName(e.target.value)}
                   placeholder="Ej: Logística, Sistemas..." 
                   className="flex-1 md:w-64 px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition-all font-bold placeholder:font-normal"
                 />
                 <button onClick={handleAddArea} className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">
                   Añadir
                 </button>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {areas.map(area => (
                <div key={area.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                         <LayoutGrid className="w-6 h-6" />
                      </div>
                      <p className="font-black text-slate-900 uppercase tracking-tight">{area.name}</p>
                   </div>
                   <button onClick={() => deleteDoc(doc(db, 'areas', area.id))} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-5 h-5" />
                   </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
        active ? "bg-slate-900 text-white shadow-xl" : "text-slate-400 hover:bg-slate-50"
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function AdminIssueCard({ issue, resolvingId, setResolvingId, resolutionText, setResolutionText, onResolve }: any) {
  return (
     <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-10">
          <div className="flex-1 space-y-6">
             <div className="flex items-center gap-4">
                <span className={cn(
                  "px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest",
                  issue.priority === 'critical' ? 'bg-red-600 text-white shadow-lg shadow-red-200' : 'bg-slate-900 text-white'
                )}>
                  {issue.priority}
                </span>
                <span className="text-xs font-black text-blue-600 uppercase tracking-[0.2em]">{issue.areaName}</span>
                <div className="h-px flex-1 bg-slate-100" />
             </div>
             
             <div>
                <h4 className="text-3xl font-black text-slate-900 leading-tight uppercase mb-2">{issue.title}</h4>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 text-xs font-black">
                     {issue.userName?.charAt(0)}
                  </div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-tighter">
                     Firma: <span className="text-slate-900">{issue.userName}</span> • {formatDate(issue.createdAt)}
                  </p>
                </div>
             </div>

             <div className="bg-slate-50 p-6 rounded-[2rem] border-l-4 border-blue-600 text-slate-600 font-medium italic">
                "{issue.description}"
             </div>
          </div>

          <div className="lg:w-[400px] flex flex-col justify-end">
            <AnimatePresence mode="wait">
              {resolvingId === issue.id ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-4">
                   <textarea
                    placeholder="Bitácora de resolución..."
                    className="w-full p-6 rounded-[2rem] bg-slate-50 border-none text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none resize-none min-h-[140px]"
                    value={resolutionText}
                    onChange={e => setResolutionText(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setResolvingId(null)} className="flex-1 py-4 text-xs font-black text-slate-400 hover:text-slate-900 uppercase">Ignorar</button>
                    <button onClick={onResolve} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                       <ArrowRight className="w-4 h-4" />
                       Cerrar Caso
                    </button>
                  </div>
                </motion.div>
              ) : (
                <button
                  onClick={() => setResolvingId(issue.id)}
                  className="w-full py-6 bg-slate-50 hover:bg-blue-600 hover:text-white text-slate-900 rounded-[2rem] font-black uppercase tracking-widest transition-all flex flex-col items-center gap-2 group"
                >
                  <Activity className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors" />
                  Atender Reporte
                </button>
              )}
            </AnimatePresence>
          </div>
        </div>
     </div>
  );
}

function CheckCircle2Icon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
  );
}
