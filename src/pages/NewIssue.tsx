import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { handleFirestoreError } from '../constants';
import { OperationType, IssuePriority, Area } from '../types';
import { AlertCircle, CheckCircle2, ChevronRight, Save, User } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function NewIssue() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);

  useEffect(() => {
    if (!profile) return;
    let areasQuery = query(collection(db, 'areas'));
    if (profile.role !== 'superadmin') {
      areasQuery = query(collection(db, 'areas'), where('guildId', '==', profile.guildId));
    }
    const unsub = onSnapshot(areasQuery, (snapshot) => {
      setAreas(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Area[]);
    });
    return () => unsub();
  }, [profile]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    areaId: '',
    reportedBy: '',
    priority: 'medium' as IssuePriority,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setLoading(true);
    setError(null);

    try {
      const selectedArea = areas.find(a => a.id === formData.areaId);
      
      await addDoc(collection(db, 'issues'), {
        ...formData,
        areaName: selectedArea?.name || 'Otro',
        status: 'open',
        userId: profile.uid,
        userName: profile.displayName,
        userEmail: profile.email,
        guildId: profile.guildId,
        reportsCount: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      navigate('/issues');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'issues');
      setError('Error al registrar la incidencia. Por favor intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Reportar Incidencia</h1>
        <p className="text-slate-500 font-medium">Completa el formulario para registrar un nuevo problema operativo.</p>
      </div>

      <motion.form 
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6"
      >
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 text-sm border border-red-100">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Título de la Incidencia</label>
          <input
            required
            type="text"
            className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder:text-slate-400"
            placeholder="Ej: Falla general en línea de producción A"
            value={formData.title}
            onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Afectado / Reportó <span className="font-normal text-slate-400">(Opcional)</span></label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder:text-slate-400"
              placeholder="Ej: Juan Perez (Operador Torre 2)"
              value={formData.reportedBy}
              onChange={e => setFormData(prev => ({ ...prev, reportedBy: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Área Afectada</label>
            <select
              required
              className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
              value={formData.areaId}
              onChange={e => setFormData(prev => ({ ...prev, areaId: e.target.value }))}
            >
              <option value="" className="text-slate-400">Seleccionar área...</option>
              {areas.map(area => (
                <option key={area.id} value={area.id}>{area.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Prioridad</label>
            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
              {(['low', 'medium', 'high', 'critical'] as IssuePriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, priority: p }))}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg uppercase tracking-widest transition-all",
                    formData.priority === p 
                      ? "bg-white text-primary-600 shadow-sm border border-slate-200" 
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                  )}
                >
                  {p === 'low' ? 'Baja' : p === 'medium' ? 'Media' : p === 'high' ? 'Alta' : 'Crítica'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Descripción Detallada</label>
          <textarea
            required
            rows={5}
            className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all resize-none placeholder:text-slate-400 leading-relaxed"
            placeholder="Describe el problema, impacto operativo y personas involucradas..."
            value={formData.description}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
          />
        </div>

        <div className="pt-4 flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/issues')}
            className="flex-1 py-4 px-6 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-all uppercase tracking-widest text-xs"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-[2] py-4 px-6 rounded-xl font-bold bg-primary-600 text-white hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/30 flex items-center justify-center gap-2 disabled:opacity-50 uppercase tracking-widest text-xs"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Registrar Incidencia
              </>
            )}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
