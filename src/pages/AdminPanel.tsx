import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp, setDoc, addDoc, getDocs, deleteDoc, where } from 'firebase/firestore';
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
  const [guilds, setGuilds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'issues' | 'users' | 'areas' | 'settings' | 'guilds'>('issues');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');

  const [newAreaName, setNewAreaName] = useState('');
  const [newGuildCode, setNewGuildCode] = useState('');
  const [newGuildName, setNewGuildName] = useState('');
  const [currentTheme, setCurrentTheme] = useState('blue');

  useEffect(() => {
    if (!profile) return;
    
    let issuesQuery = query(collection(db, 'issues'));
    let usersQuery = query(collection(db, 'users'));
    let areasQuery = query(collection(db, 'areas'));
    let guildsQuery = query(collection(db, 'guilds'));

    if (profile.role !== 'superadmin') {
      issuesQuery = query(collection(db, 'issues'), where('guildId', '==', profile.guildId));
      usersQuery = query(collection(db, 'users'), where('guildId', '==', profile.guildId));
      areasQuery = query(collection(db, 'areas'), where('guildId', '==', profile.guildId));
    }

    const unsubIssues = onSnapshot(issuesQuery, (snapshot) => {
      const issuesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Issue[];
      issuesList.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      setIssues(issuesList);
      setLoading(false);
    });

    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserProfile[];
      usersList.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      setUsers(usersList);
    });

    const unsubAreas = onSnapshot(areasQuery, (snapshot) => {
      setAreas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Area[]);
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', profile.guildId), (docSnap) => {
      if (docSnap.exists()) {
        setCurrentTheme(docSnap.data().themeColor || 'blue');
      }
    });

    let unsubGuilds = () => {};
    if (profile.role === 'superadmin') {
      unsubGuilds = onSnapshot(guildsQuery, (snapshot) => {
        setGuilds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }

    return () => {
      unsubIssues();
      unsubUsers();
      unsubAreas();
      unsubSettings();
      unsubGuilds();
    };
  }, [profile]);

  const handleUpdateTheme = async (color: string) => {
    if (!profile) return;
    try {
      await setDoc(doc(db, 'settings', profile.guildId), {
        themeColor: color,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error("Error setting theme", err);
    }
  };

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
    if (!newAreaName || !profile) return;
    try {
      const id = newAreaName.toLowerCase().replace(/\s+/g, '-');
      await setDoc(doc(db, 'areas', id), {
        id,
        name: newAreaName,
        color: 'blue',
        guildId: profile.guildId, // Admin rule requires guildId match
      });
      setNewAreaName('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddGuild = async () => {
    if (!newGuildCode || !newGuildName || profile?.role !== 'superadmin') return;
    try {
      const code = newGuildCode.toUpperCase().trim();
      await setDoc(doc(db, 'guilds', code), {
        id: code,
        name: newGuildName,
        createdAt: serverTimestamp()
      });
      setNewGuildName('');
      setNewGuildCode('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    if (profile?.role !== 'superadmin') return;
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
    } catch (err) {
      console.error(err);
    }
  };

  const pendingIssues = issues.filter(i => i.status === 'open' || i.status === 'in_progress');

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Panel de Administración</h1>
          <p className="text-slate-500 font-medium">Gestión administrativa de la plataforma.</p>
        </div>
        
        <div className="flex bg-white rounded-2xl border border-slate-200 p-1 shadow-sm overflow-x-auto">
          <TabButton active={activeTab === 'issues'} onClick={() => setActiveTab('issues')} icon={Activity} label="Incidencias" />
          <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={Users} label="Usuarios" />
          <TabButton active={activeTab === 'areas'} onClick={() => setActiveTab('areas')} icon={LayoutGrid} label="Divisiones" />
          <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={Settings2} label="Configuración" />
          {profile?.role === 'superadmin' && (
            <TabButton active={activeTab === 'guilds'} onClick={() => setActiveTab('guilds')} icon={ShieldCheck} label="Empresas" />
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'issues' && (
          <motion.div key="issues" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
            <div className="bg-primary-600 rounded-[3rem] p-10 text-white shadow-lg shadow-primary-600/20 relative overflow-hidden">
               <div className="relative z-10 space-y-2">
                 <p className="text-primary-200 font-black uppercase tracking-[0.3em] text-[10px]">Estatus de Red</p>
                 <div className="flex items-baseline gap-4">
                   <h2 className="text-6xl font-black">{pendingIssues.length}</h2>
                   <p className="text-xl font-bold opacity-80 uppercase tracking-tighter">Reportes Pendientes</p>
                 </div>
               </div>
               <ShieldCheck className="absolute top-1/2 right-10 -translate-y-1/2 w-56 h-56 text-white/10" />
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
                <div className="bg-white rounded-[2.5rem] p-20 text-center border-2 border-dashed border-slate-200">
                   <CheckCircle2Icon className="w-16 h-16 text-emerald-500 mx-auto mb-6 opacity-50" />
                   <h3 className="text-2xl font-black text-slate-900 uppercase">Sin Pendientes</h3>
                   <p className="text-slate-500 font-medium">Todo el sistema está operando con normalidad.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-8 py-6 text-xs font-black text-slate-500 uppercase tracking-widest">Colaborador</th>
                  <th className="px-8 py-6 text-xs font-black text-slate-500 uppercase tracking-widest">Rol</th>
                  <th className="px-8 py-6 text-xs font-black text-slate-500 uppercase tracking-widest">Registro</th>
                  <th className="px-8 py-6 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Opciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-900">
                {users.map(user => (
                  <tr key={user.uid} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-100 text-primary-600 flex items-center justify-center font-black uppercase shadow-sm">
                           {user.displayName?.charAt(0)}
                         </div>
                         <div>
                           <p className="text-sm font-black uppercase">{user.displayName || 'Sin Nombre'}</p>
                           <p className="text-xs font-bold text-slate-500">{user.email}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       {profile.role === 'superadmin' ? (
                         <select
                           value={user.role}
                           onChange={(e) => handleUpdateUserRole(user.uid, e.target.value)}
                           className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl focus:ring-primary-500 font-bold p-2"
                         >
                           <option value="user">USER</option>
                           <option value="admin">ADMIN</option>
                           <option value="superadmin">SUPERADMIN</option>
                         </select>
                       ) : (
                         <span className={cn(
                           "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                           user.role === 'admin' ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-600 border border-slate-200"
                         )}>
                           {user.role}
                         </span>
                       )}
                    </td>
                    <td className="px-8 py-6 text-xs font-bold text-slate-500">
                       {formatDate(user.createdAt)}
                    </td>
                    <td className="px-8 py-6 text-right">
                       <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-primary-600">
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
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 flex flex-col md:flex-row items-center gap-6 shadow-sm text-slate-900">
               <div className="flex-1 space-y-1">
                 <h3 className="text-xl font-black uppercase tracking-tight">Nueva Área/División</h3>
                 <p className="text-sm text-slate-500 font-medium">Define una nueva área operativa.</p>
               </div>
               <div className="flex gap-2 w-full md:w-auto">
                 <input 
                   type="text" 
                   value={newAreaName}
                   onChange={e => setNewAreaName(e.target.value)}
                   placeholder="Ej: Planta Sur, Piso 4..." 
                   className="flex-1 md:w-64 px-6 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl text-sm focus:ring-2 focus:ring-primary-500 transition-all font-bold placeholder:font-normal placeholder:text-slate-400"
                 />
                 <button onClick={handleAddArea} className="px-6 py-4 bg-primary-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary-700 shadow-lg shadow-primary-600/20 transition-all">
                   Añadir
                 </button>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {areas.map(area => (
                <div key={area.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center justify-between group">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600 border border-primary-100">
                         <LayoutGrid className="w-6 h-6" />
                      </div>
                      <p className="font-black text-slate-900 uppercase tracking-tight">{area.name}</p>
                   </div>
                   <button onClick={() => deleteDoc(doc(db, 'areas', area.id))} className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-5 h-5" />
                   </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {profile?.role === 'superadmin' && activeTab === 'guilds' && (
          <motion.div key="guilds" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 flex flex-col items-center gap-6 shadow-sm text-slate-900">
               <div className="w-full space-y-1 mb-2">
                 <h3 className="text-xl font-black uppercase tracking-tight">Nueva Empresa / Franquicia</h3>
                 <p className="text-sm text-slate-500 font-medium">Registra una nueva entidad en el sistema multiplataforma.</p>
               </div>
               <div className="flex flex-col md:flex-row gap-4 w-full">
                 <input 
                   type="text" 
                   value={newGuildName}
                   onChange={e => setNewGuildName(e.target.value)}
                   placeholder="Nombre de la empresa" 
                   className="flex-1 px-6 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl text-sm focus:ring-2 focus:ring-primary-500 transition-all font-bold placeholder:font-normal placeholder:text-slate-400"
                 />
                 <input 
                   type="text" 
                   value={newGuildCode}
                   onChange={e => setNewGuildCode(e.target.value)}
                   placeholder="Código (Ej: EMP_01)" 
                   className="flex-1 px-6 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl text-sm focus:ring-2 focus:ring-primary-500 transition-all font-bold placeholder:font-normal placeholder:text-slate-400 uppercase"
                 />
                 <button onClick={handleAddGuild} className="px-8 py-4 bg-primary-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary-700 shadow-lg shadow-primary-600/20 transition-all flex items-center justify-center gap-2">
                   <Plus className="w-4 h-4" /> Registrar
                 </button>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {guilds.map(guild => (
                <div key={guild.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center justify-between group">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                         <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                         <p className="font-black text-slate-900 uppercase tracking-tight">{guild.name}</p>
                         <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{guild.id}</p>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
             <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm text-slate-900">
               <div className="mb-8">
                 <h3 className="text-xl font-black uppercase tracking-tight">Apariencia del Portal</h3>
                 <p className="text-sm text-slate-500 font-medium">Personaliza el color principal de la plataforma para todo el equipo.</p>
               </div>
               
               <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                 {[
                   { id: 'blue', name: 'Azul', hex: '#2563eb' },
                   { id: 'emerald', name: 'Esmeralda', hex: '#059669' },
                   { id: 'violet', name: 'Violeta', hex: '#7c3aed' },
                   { id: 'rose', name: 'Rosa', hex: '#e11d48' },
                   { id: 'amber', name: 'Ámbar', hex: '#d97706' },
                 ].map(theme => (
                   <button
                     key={theme.id}
                     onClick={() => handleUpdateTheme(theme.id)}
                     className={cn(
                       "flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all",
                       currentTheme === theme.id 
                         ? "border-primary-600 bg-primary-50 shadow-md shadow-primary-600/10" 
                         : "border-slate-100 hover:border-slate-300 bg-white"
                     )}
                   >
                     <div 
                       className="w-12 h-12 rounded-full shadow-inner"
                       style={{ backgroundColor: theme.hex }}
                     />
                     <span className="text-xs font-black uppercase tracking-widest text-slate-700">{theme.name}</span>
                   </button>
                 ))}
               </div>
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
        active ? "bg-primary-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function AdminIssueCard({ issue, resolvingId, setResolvingId, resolutionText, setResolutionText, onResolve }: any) {
  return (
     <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-10">
          <div className="flex-1 space-y-6">
             <div className="flex items-center gap-4">
                <span className={cn(
                  "px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                  issue.priority === 'critical' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-600'
                )}>
                  {issue.priority}
                </span>
                <span className="text-xs font-black text-primary-600 uppercase tracking-[0.2em]">{issue.areaName}</span>
                <div className="h-px flex-1 bg-slate-100" />
             </div>
             
             <div>
                <h4 className="text-3xl font-black text-slate-900 leading-tight uppercase mb-2">{issue.title}</h4>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600 text-xs font-black">
                     {issue.userName?.charAt(0)}
                  </div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-tighter">
                     Reportado por: <span className="text-slate-600">{issue.userName}</span> • {formatDate(issue.createdAt)}
                  </p>
                </div>
             </div>

             <div className="bg-slate-50 p-6 rounded-[2rem] border-l-4 border-primary-600 text-slate-600 font-medium italic">
                "{issue.description}"
             </div>
          </div>

          <div className="lg:w-[400px] flex flex-col justify-end">
            <AnimatePresence mode="wait">
              {resolvingId === issue.id ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-4">
                   <textarea
                    placeholder="Escribe la resolución de la incidencia..."
                    className="w-full p-6 rounded-[2rem] bg-white border border-slate-200 text-slate-900 text-sm font-medium focus:ring-2 focus:ring-primary-500 outline-none resize-none min-h-[140px] placeholder:text-slate-400"
                    value={resolutionText}
                    onChange={e => setResolutionText(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setResolvingId(null)} className="flex-1 py-4 text-xs font-black text-slate-500 hover:text-slate-900 uppercase">Cancelar</button>
                    <button onClick={onResolve} className="flex-[2] py-4 bg-primary-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all flex items-center justify-center gap-2">
                       <ArrowRight className="w-4 h-4" />
                       Cerrar Caso
                    </button>
                  </div>
                </motion.div>
              ) : (
                <button
                  onClick={() => setResolvingId(issue.id)}
                  className="w-full py-6 bg-slate-50 hover:bg-primary-600 hover:text-white text-slate-600 rounded-[2rem] border border-slate-200 font-black uppercase tracking-widest transition-all flex flex-col items-center gap-2 group"
                >
                  <Activity className="w-8 h-8 text-primary-500 group-hover:text-white transition-colors" />
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
