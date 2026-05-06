import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Issue, OperationType } from '../types';
import { handleFirestoreError } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Cell, PieChart, Pie } from 'recharts';
import { AlertCircle, CheckCircle2, Clock, ShieldAlert, TrendingUp, Users, Activity, Zap, Box, ListTodo, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { cn, formatDate } from '../lib/utils';
import { useAuth } from '../AuthContext';

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

export default function Dashboard() {
  const { profile } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!profile) return;
    
    let q = query(collection(db, 'issues'));
    if (profile.role !== 'superadmin') {
      const allGuilds = [profile.guildId, ...(profile.allowedGuilds || [])].slice(0, 30);
      q = query(collection(db, 'issues'), where('guildId', 'in', allGuilds));
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const issuesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Issue[];
      
      issuesList.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      
      setIssues(issuesList);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'issues');
    });

    return () => unsubscribe();
  }, [profile]);

  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      if (!issue.createdAt) return true;
      const date = issue.createdAt.toDate ? issue.createdAt.toDate() : new Date(issue.createdAt);
      if (startDate) {
        const startD = new Date(startDate);
        startD.setHours(0, 0, 0, 0);
        if (date < startD) return false;
      }
      if (endDate) {
        const endD = new Date(endDate);
        endD.setHours(23, 59, 59, 999);
        if (date > endD) return false;
      }
      return true;
    });
  }, [issues, startDate, endDate]);

  const stats = {
    total: filteredIssues.length,
    open: filteredIssues.filter(i => i.status === 'open').length,
    inProgress: filteredIssues.filter(i => i.status === 'in_progress').length,
    resolved: filteredIssues.filter(i => i.status === 'resolved').length,
    critical: filteredIssues.filter(i => i.priority === 'critical').length,
    active: filteredIssues.filter(i => i.status !== 'resolved' && i.status !== 'closed').length,
  };

  const weekDataMap = useMemo(() => {
    const map = new Map<string, number>();
    const chronological = [...filteredIssues].reverse();
    chronological.forEach(issue => {
      if (!issue.createdAt) return;
      const date = issue.createdAt.toDate ? issue.createdAt.toDate() : new Date(issue.createdAt);
      const month = date.toLocaleString('es-ES', { month: 'short' });
      const day = date.getDate();
      const weekNum = Math.min(4, Math.ceil(day / 7));
      const label = `S${weekNum} ${month}`;
      map.set(label, (map.get(label) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredIssues]);

  const areaDataMap = filteredIssues.reduce((acc, issue) => {
    acc[issue.areaName] = (acc[issue.areaName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const areaData = Object.entries(areaDataMap).map(([name, value]) => ({ name, value }));

  const statusData = [
    { name: 'Abierto', value: stats.open },
    { name: 'En Proceso', value: stats.inProgress },
    { name: 'Resuelto', value: stats.resolved },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4 flex-wrap w-full md:w-auto">
           <div className="flex bg-white rounded-2xl border border-slate-200 p-2 shadow-sm gap-2">
             <div className="flex items-center gap-2 px-2">
               <Calendar className="w-4 h-4 text-slate-400" />
               <input 
                 type="date" 
                 value={startDate}
                 onChange={(e) => setStartDate(e.target.value)}
                 className="text-xs font-bold text-slate-600 outline-none bg-transparent"
               />
             </div>
             <span className="text-slate-300">-</span>
             <div className="flex items-center gap-2 px-2">
               <input 
                 type="date" 
                 value={endDate}
                 onChange={(e) => setEndDate(e.target.value)}
                 className="text-xs font-bold text-slate-600 outline-none bg-transparent"
               />
             </div>
             {(startDate || endDate) && (
               <button 
                 onClick={() => { setStartDate(''); setEndDate(''); }}
                 className="text-[10px] text-red-500 hover:text-red-700 font-bold px-2 uppercase"
               >
                 Limpiar
               </button>
             )}
             <button 
               onClick={() => { 
                 const now = new Date();
                 const day = now.getDay() || 7;
                 const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
                 setStartDate(start.toISOString().split('T')[0]);
                 setEndDate(new Date().toISOString().split('T')[0]);
               }}
               className="text-[10px] text-blue-500 hover:text-blue-700 font-bold px-2 uppercase border-l border-slate-100"
             >
               Semana
             </button>
             <button 
               onClick={() => { 
                 const now = new Date();
                 const start = new Date(now.getFullYear(), now.getMonth(), 1);
                 setStartDate(start.toISOString().split('T')[0]);
                 setEndDate(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);
               }}
               className="text-[10px] text-blue-500 hover:text-blue-700 font-bold px-2 uppercase border-l border-slate-100"
             >
               Mes
             </button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <GlassCard 
          label="Incidencias Activas" 
          value={stats.active} 
          icon={Activity} 
          color="blue" 
          description="Reportes activos actualmente"
        />
        <GlassCard 
          label="Tareas Cerradas" 
          value={stats.resolved} 
          icon={CheckCircle2} 
          color="emerald" 
          description="Incidencias resueltas"
        />
        <GlassCard 
          label="Prioridad Crítica" 
          value={stats.critical} 
          icon={AlertCircle} 
          color="red" 
          description="Requiere atención inmediata"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm overflow-hidden relative text-slate-900">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Actividad Semanal</h3>
                <p className="text-sm text-slate-500">Volumen de incidencias por semana (Máx 4 por mes)</p>
              </div>
              <Activity className="w-6 h-6 text-slate-300" />
            </div>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weekDataMap}>
                  <defs>
                    <linearGradient id="colorValueWeek" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.05)', padding: '12px' }}
                    labelStyle={{ fontWeight: 800, color: '#0f172a' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorValueWeek)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm overflow-hidden relative text-slate-900">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Actividad por Área</h3>
                <p className="text-sm text-slate-500">Volumen de incidencias detectadas</p>
              </div>
              <Box className="w-6 h-6 text-slate-300" />
            </div>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={areaData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.05)', padding: '12px' }}
                    labelStyle={{ fontWeight: 800, color: '#0f172a' }}
                    cursor={{ fill: 'transparent' }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-slate-900 relative">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800">Últimos Registros</h3>
              <ListTodo className="w-5 h-5 text-slate-400" />
            </div>
            <div className="space-y-3">
              {filteredIssues.slice(0, 4).map((issue) => (
                <div key={issue.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-primary-100 transition-all group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center font-semibold text-primary-600 text-sm">
                      {issue.userName?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-slate-800 group-hover:text-primary-600 transition-colors">{issue.title}</p>
                      <p className="text-xs text-slate-500">{issue.areaName} • {formatDate(issue.createdAt)}</p>
                    </div>
                  </div>
                  <ChevronRightIcon className="w-4 h-4 text-slate-300 group-hover:text-primary-500 transition-colors" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-full text-slate-900">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Balance Global</h3>
            <div className="h-64 mb-10">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={8} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {statusData.map((s, i) => (
                <div key={s.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs font-semibold text-slate-600">{s.name}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GlassCard({ label, value, icon: Icon, color, description }: any) {
  const themes: any = {
    blue: 'bg-primary-50 text-primary-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <motion.div 
      className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-3 rounded-xl", themes[color])}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="text-right">
           <p className="text-xs font-semibold text-slate-500">{label}</p>
           <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
      </div>
      <p className="text-xs text-slate-400">
        {description}
      </p>
    </motion.div>
  );
}

function ChevronRightIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
  );
}
