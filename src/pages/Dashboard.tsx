import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Issue, OperationType } from '../types';
import { handleFirestoreError } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Cell, PieChart, Pie } from 'recharts';
import { AlertCircle, CheckCircle2, Clock, ShieldAlert, TrendingUp, Users, Activity, Zap, Box, ListTodo } from 'lucide-react';
import { motion } from 'motion/react';
import { cn, formatDate } from '../lib/utils';
import { useAuth } from '../AuthContext';

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

export default function Dashboard() {
  const { profile } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'issues'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const issuesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Issue[];
      setIssues(issuesList);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'issues');
    });

    return () => unsubscribe();
  }, []);

  const stats = {
    total: issues.length,
    open: issues.filter(i => i.status === 'open').length,
    inProgress: issues.filter(i => i.status === 'in_progress').length,
    resolved: issues.filter(i => i.status === 'resolved').length,
    critical: issues.filter(i => i.priority === 'critical').length,
    active: issues.filter(i => i.status !== 'resolved' && i.status !== 'closed').length,
  };

  const areaDataMap = issues.reduce((acc, issue) => {
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Azeroth Core</h1>
          <p className="text-slate-500 font-medium">Panel de Control de Inteligencia Operativa</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-4">
           <div className="text-right">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronización</p>
             <p className="text-xs font-bold text-emerald-500 flex items-center gap-1 justify-end">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               EN TIEMPO REAL
             </p>
           </div>
           <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
             <Zap className="w-6 h-6" />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <GlassCard 
          label="Carga de Trabajo" 
          value={stats.active} 
          icon={Activity} 
          color="blue" 
          description="Incidencias activas actualmente"
        />
        <GlassCard 
          label="Resolución" 
          value={`${Math.round((stats.resolved / stats.total) * 100 || 0)}%`} 
          icon={CheckCircle2} 
          color="emerald" 
          description="Tasa de éxito acumulada"
        />
        <GlassCard 
          label="Nivel Crítico" 
          value={stats.critical} 
          icon={AlertCircle} 
          color="red" 
          description="Requiere atención inmediata"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden relative">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Distribución por Áreas</h3>
                <p className="text-sm text-slate-400 font-medium">Volumen de incidencias por departamento</p>
              </div>
              <Box className="w-8 h-8 text-blue-100" />
            </div>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    labelStyle={{ fontWeight: 800, color: '#1e293b' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl text-white overflow-hidden relative">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black uppercase tracking-tight">Última Actividad</h3>
                <ListTodo className="w-6 h-6 text-blue-400" />
              </div>
              <div className="space-y-4">
                {issues.slice(0, 4).map((issue) => (
                  <div key={issue.id} className="flex items-center justify-between p-5 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-lg">
                        {issue.userName?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-sm group-hover:text-blue-400 transition-colors uppercase">{issue.title}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{issue.areaName} • {formatDate(issue.createdAt)}</p>
                      </div>
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl" />
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm h-full">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-8">Estado Global</h3>
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
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              {statusData.map((s, i) => (
                <div key={s.name} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{s.name}</span>
                  </div>
                  <span className="text-sm font-black text-slate-900">{s.value}</span>
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
    blue: 'border-blue-100 bg-blue-50/50 text-blue-600',
    emerald: 'border-emerald-100 bg-emerald-50/50 text-emerald-600',
    red: 'border-red-100 bg-red-50/50 text-red-600',
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.02, y: -5 }}
      className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between"
    >
      <div className="flex items-start justify-between mb-6">
        <div className={cn("p-4 rounded-2xl border", themes[color])}>
          <Icon className="w-8 h-8" />
        </div>
        <div className="text-right">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
           <p className="text-3xl font-black text-slate-900 mt-1">{value}</p>
        </div>
      </div>
      <p className="text-xs font-bold text-slate-400 italic">
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
