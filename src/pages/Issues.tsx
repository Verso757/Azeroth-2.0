import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, addDoc, getDocs, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Issue, IssueEvent, IssueStatus, OperationType } from '../types';
import { handleFirestoreError } from '../constants';
import { Filter, Search, Clock, CheckCircle2, AlertTriangle, MoreHorizontal, XCircle, MessageSquare, UserPlus, ArrowRight, Tag, ChevronRight, X, Download, PlusSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDate, exportToCSV } from '../lib/utils';

const STATUS_LABELS = {
  open: { label: 'Abierto', color: 'text-primary-700 bg-primary-50 border-primary-200', icon: Clock },
  in_progress: { label: 'En Proceso', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: AlertTriangle },
  resolved: { label: 'Resuelto', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  closed: { label: 'Cerrado', color: 'text-slate-600 bg-slate-100 border-slate-200', icon: XCircle },
};

export default function Issues() {
  const { profile, isAdmin } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'mine' | 'assigned'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  useEffect(() => {
    if (!profile) return;

    let q = query(collection(db, 'issues'));
    
    if (profile.role !== 'superadmin') {
      const allGuilds = [profile.guildId, ...(profile.allowedGuilds || [])].slice(0, 30);
      q = query(collection(db, 'issues'), where('guildId', 'in', allGuilds));
      if (filter === 'mine') {
        q = query(collection(db, 'issues'), where('guildId', 'in', allGuilds), where('userId', '==', profile.uid));
      } else if (filter === 'assigned') {
        q = query(collection(db, 'issues'), where('guildId', 'in', allGuilds), where('assignedTo', '==', profile.uid));
      }
    } else {
      // Superadmin filtering
      if (filter === 'mine') {
        q = query(collection(db, 'issues'), where('userId', '==', profile.uid));
      } else if (filter === 'assigned') {
        q = query(collection(db, 'issues'), where('assignedTo', '==', profile.uid));
      }
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const issuesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Issue[];
      
      // Sort client-side to avoid manual Composite Index creation
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
  }, [profile, isAdmin, filter]);

  const filteredIssues = issues.filter(issue => 
    issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.areaName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.userName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const rows = [];
      for (const issue of filteredIssues) {
        rows.push({
          'ID': `#${issue.id.slice(-6).toUpperCase()}`,
          'Folio Origen': '',
          'Hora': formatDate(issue.createdAt),
          'Quien Reporto': issue.userName,
          'Persona Afectada': issue.reportedBy || '',
          'Area Problema': issue.areaName || issue.areaId || '',
          'Detalle': `${issue.title} - ${issue.description}`,
          'Tipo': 'Original',
          'Estado': issue.status
        });

        if ((issue.reportsCount || 1) > 1) {
          const eventsSnapshot = await getDocs(query(collection(db, 'issues', issue.id, 'events'), orderBy('createdAt', 'asc')));
          const events = eventsSnapshot.docs.map(d => d.data());
          events.forEach(evt => {
            if (evt.type === 'comment' && evt.content.includes('Reincidencia reportada por')) {
              let affectedPerson = '';
              const match = evt.content.match(/\(Afectado: (.*?)\)/);
              if (match) affectedPerson = match[1];

              rows.push({
                'ID': `#${issue.id.slice(-6).toUpperCase()}`,
                'Folio Origen': `#${issue.id.slice(-6).toUpperCase()}`,
                'Hora': formatDate(evt.createdAt),
                'Quien Reporto': evt.userName,
                'Persona Afectada': affectedPerson,
                'Area Problema': issue.areaName || issue.areaId || '',
                'Detalle': `${issue.title} - ${issue.description}`,
                'Tipo': 'Reincidencia',
                'Estado': issue.status
              });
            }
          });
        }
      }
      exportToCSV(rows, 'incidencias_ops');
    } catch (e) {
      console.error(e);
      alert('Error exportando CSV');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Registro de Incidencias</h1>
          <p className="text-slate-500 font-medium">Historial y seguimiento de problemas de la operación.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleExportCSV}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all font-black uppercase text-xs tracking-widest shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exportando...' : 'Descargar CSV'}
          </button>
          
          <div className="flex bg-white rounded-2xl border border-slate-200 p-1 shadow-sm">
            <button onClick={() => setFilter('all')} className={cn("px-4 py-2 text-xs font-bold rounded-xl transition-all uppercase tracking-widest", filter === 'all' ? "bg-primary-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")}>Todas</button>
            <button onClick={() => setFilter('mine')} className={cn("px-4 py-2 text-xs font-bold rounded-xl transition-all uppercase tracking-widest", filter === 'mine' ? "bg-primary-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")}>Mis Reportes</button>
            <button onClick={() => setFilter('assigned')} className={cn("px-4 py-2 text-xs font-bold rounded-xl transition-all uppercase tracking-widest", filter === 'assigned' ? "bg-primary-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")}>Asignadas</button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar reporte..."
              className="pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary-500 text-slate-900 outline-none w-full md:w-64 transition-all shadow-sm font-medium placeholder:text-slate-400"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-3xl border border-slate-100 animate-pulse" />
          ))
        ) : filteredIssues.length > 0 ? (
          filteredIssues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} onClick={() => setSelectedIssue(issue)} />
          ))
        ) : (
          <div className="bg-slate-50 rounded-3xl border border-dashed border-slate-200 p-20 text-center">
            <Filter className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900">Sin resultados</h3>
            <p className="text-slate-500">No hay incidencias que coincidan con tu búsqueda.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedIssue && (
          <IssueDetailModal 
            issue={selectedIssue} 
            onClose={() => setSelectedIssue(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const IssueCard: React.FC<{ issue: Issue; onClick: () => void }> = ({ issue, onClick }) => {
  const status = STATUS_LABELS[issue.status] || STATUS_LABELS.open;
  const StatusIcon = status.icon;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="group bg-white rounded-3xl border border-slate-100 p-6 flex flex-col md:flex-row gap-6 hover:border-primary-200 hover:shadow-xl hover:shadow-primary-900/5 transition-all cursor-pointer relative overflow-hidden"
    >
      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", 
        issue.priority === 'critical' ? 'bg-red-500' :
        issue.priority === 'high' ? 'bg-orange-500' :
        issue.priority === 'medium' ? 'bg-amber-400' : 'bg-slate-300'
      )} />

      <div className="flex-1 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{issue.areaName}</span>
              <div className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border",
                status.color
              )}>
                <StatusIcon className="w-3 h-3" />
                {status.label}
              </div>
            </div>
            <h3 className="text-xl font-black text-slate-900 group-hover:text-primary-600 transition-colors uppercase leading-none">{issue.title}</h3>
          </div>
          <div className="text-right">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter block">{formatDate(issue.createdAt)}</span>
          </div>
        </div>

        <p className="text-slate-500 text-sm font-medium line-clamp-1 italic">
          "{issue.description}"
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
             <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-[10px] font-black">{issue.userName?.charAt(0) || 'U'}</div>
             <span className="text-xs font-bold text-slate-600 truncate max-w-[120px]">{issue.userName}</span>
          </div>
          {Array.isArray(issue.affectedPeople) && issue.affectedPeople.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-xl border border-blue-100">
               <span className="text-xs font-bold text-blue-700 truncate max-w-[120px]">Afectados: {issue.affectedPeople.join(', ')}</span>
            </div>
          )}
          {issue.assignedToName && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-xl border border-emerald-100">
               <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
               <span className="text-xs font-bold text-emerald-700 truncate max-w-[120px]">Asignado: {issue.assignedToName}</span>
            </div>
          )}
          {(issue.reportsCount && issue.reportsCount > 1) ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-xl border border-red-100">
               <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
               <span className="text-xs font-bold text-red-700">{issue.reportsCount} Reportes</span>
            </div>
          ) : null}
        </div>
      </div>
      
      <div className="flex items-center justify-center p-4">
        <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-primary-500 transition-colors" />
      </div>
    </motion.div>
  );
}

function IssueDetailModal({ issue, onClose }: { issue: Issue, onClose: () => void }) {
  const { profile, isAdmin } = useAuth();
  const [events, setEvents] = useState<IssueEvent[]>([]);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReincidenceInput, setShowReincidenceInput] = useState(false);
  const [newAffectedPerson, setNewAffectedPerson] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'issues', issue.id, 'events'), 
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEvents(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as IssueEvent[]);
    });
    return () => unsubscribe();
  }, [issue.id]);

  const addEvent = async (type: IssueEvent['type'], content: string, extra = {}) => {
    if (!profile) return;
    await addDoc(collection(db, 'issues', issue.id, 'events'), {
      issueId: issue.id,
      type,
      userId: profile.uid,
      userName: profile.displayName,
      content,
      createdAt: new Date().toISOString(),
      ...extra
    });
  };

  const handlePostComment = async () => {
    if (!comment.trim()) return;
    setIsSubmitting(true);
    try {
      await addEvent('comment', comment);
      setComment('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: IssueStatus) => {
    try {
      const issueRef = doc(db, 'issues', issue.id);
      await updateDoc(issueRef, { 
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      await addEvent('status_change', `Cambió el estado a ${newStatus}`, { from: issue.status, to: newStatus });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh]"
      >
        {/* Left Side: Content */}
        <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-8">
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-slate-400" />
            </button>
            <div className="flex gap-2">
              {showReincidenceInput ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newAffectedPerson}
                    onChange={(e) => setNewAffectedPerson(e.target.value)}
                    placeholder="Persona afectada (Opcional)"
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-primary-500"
                    autoFocus
                  />
                  <button 
                    onClick={async () => {
                       if (!profile || issue.reporters?.includes(profile.uid)) return;
                       try {
                         const issueRef = doc(db, 'issues', issue.id);
                         const updates: any = { 
                           reportsCount: (issue.reportsCount || 1) + 1,
                           reporters: arrayUnion(profile.uid),
                           updatedAt: serverTimestamp()
                         };
                         if (newAffectedPerson.trim()) {
                           updates.affectedPeople = arrayUnion(newAffectedPerson.trim());
                         }
                         await updateDoc(issueRef, updates);
                         await addEvent('comment', `➕ Reincidencia reportada por ${profile.displayName}${newAffectedPerson.trim() ? ` (Afectado: ${newAffectedPerson.trim()})` : ''}`);
                         setShowReincidenceInput(false);
                         setNewAffectedPerson('');
                       } catch(e) {
                         console.error(e);
                       }
                    }}
                    className="px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold hover:bg-primary-700 transition-all uppercase tracking-widest"
                  >
                    Confirmar
                  </button>
                  <button 
                    onClick={() => setShowReincidenceInput(false)}
                    className="px-3 py-2 bg-slate-100 text-slate-500 rounded-xl text-xs hover:bg-slate-200 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setShowReincidenceInput(true)}
                  disabled={issue.reporters?.includes(profile?.uid || '')}
                  className={cn(
                    "px-6 py-2 rounded-xl text-xs font-bold shadow-sm border border-slate-200 transition-all flex items-center gap-2 uppercase tracking-widest",
                    issue.reporters?.includes(profile?.uid || '') ? "opacity-50 cursor-not-allowed bg-slate-50 text-slate-400" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  <PlusSquare className="w-4 h-4" />
                  {issue.reporters?.includes(profile?.uid || '') ? 'Ya Reportado' : 'Reincidencia'}
                </button>
              )}
              {isAdmin && issue.status !== 'resolved' && (
                <button 
                  onClick={() => handleStatusChange('resolved')}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all uppercase tracking-widest"
                >
                  Confirmar Resolución
                </button>
              )}
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-2">
               <div className="flex items-center gap-3">
                 <span className="text-[10px] font-black text-primary-600 uppercase tracking-[0.2em]">{issue.areaName}</span>
                 <span className="text-xs font-bold text-slate-300">•</span>
                 <span className="text-xs font-bold text-slate-500">{formatDate(issue.createdAt)}</span>
               </div>
               <h2 className="text-4xl font-black text-slate-900 leading-tight uppercase">{issue.title}</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
               <InfoTile label="Prioridad" value={issue.priority} color={issue.priority === 'critical' ? 'red' : 'blue'} />
               <InfoTile label="Estado" value={issue.status} color="slate" />
               <InfoTile label="Reportó" value={issue.userName} color="slate" />
               <InfoTile label="ID" value={`#${issue.id.slice(-6).toUpperCase()}`} color="slate" />
               <InfoTile label="Reportes" value={issue.reportsCount?.toString() || '1'} color={(issue.reportsCount || 1) > 1 ? 'amber' : 'slate'} />
            </div>

            {Array.isArray(issue.affectedPeople) && issue.affectedPeople.length > 0 && (
              <div className="space-y-4 pt-4">
                <h4 className="text-sm font-black text-blue-600 uppercase tracking-widest border-b border-blue-100 pb-2">Personas Afectadas</h4>
                <div className="flex flex-wrap gap-2">
                  {issue.affectedPeople.map((person, idx) => (
                    <div key={idx} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold border border-blue-100">
                      {person}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary-500" />
                Descripción del Problema
              </h4>
              <p className="text-slate-700 font-medium leading-relaxed bg-slate-50 border border-slate-100 p-6 rounded-3xl italic">
                "{issue.description}"
              </p>
            </div>
            
            {issue.status === 'resolved' && (
              <div className="space-y-4">
                <h4 className="text-sm font-black text-emerald-600 uppercase tracking-widest border-b border-emerald-100 pb-2">Resolución</h4>
                <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 italic font-medium text-emerald-700">
                  {issue.resolution || 'Incidencia resuelta sin comentarios adicionales.'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Timeline & Comments */}
        <div className="w-full md:w-[400px] bg-slate-50 border-l border-slate-100 flex flex-col h-full">
          <div className="p-8 border-b border-slate-100">
             <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
               <MessageSquare className="w-4 h-4 text-primary-500" />
               Registro de Actividad
             </h4>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
            {events.map((event) => (
              <div key={event.id} className="relative pl-10 space-y-1">
                <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center z-10">
                   {event.type === 'comment' ? <MessageSquare className="w-3 h-3 text-primary-500" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
                </div>
                <div className="absolute left-[11px] top-6 bottom-[-24px] w-0.5 bg-slate-200 last:hidden" />
                
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                  {event.userName} • {formatDate(event.createdAt)}
                </p>
                <div className={cn(
                  "p-4 rounded-2xl text-sm font-medium",
                  event.type === 'comment' ? "bg-white shadow-sm text-slate-700 border border-slate-100" : "bg-primary-50 text-primary-700 italic text-xs border border-primary-100"
                )}>
                  {event.content}
                </div>
              </div>
            ))}
          </div>

          <div className="p-8 bg-white border-t border-slate-100">
            <div className="relative">
              <textarea
                placeholder="Añadir comentario..."
                className="w-full pl-4 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all resize-none min-h-[100px] placeholder:text-slate-400"
                value={comment}
                onChange={e => setComment(e.target.value)}
              />
              <button 
                onClick={handlePostComment}
                disabled={isSubmitting || !comment.trim()}
                className="absolute right-3 bottom-3 p-3 bg-primary-600 text-white rounded-xl shadow-lg shadow-primary-200 hover:bg-primary-700 transition-all disabled:opacity-50"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function InfoTile({ label, value, color }: { label: string, value: string, color: 'blue' | 'red' | 'slate' | 'amber' }) {
  const colors = {
    blue: 'text-primary-700 bg-primary-50 border border-primary-200',
    red: 'text-red-700 bg-red-50 border border-red-200',
    slate: 'text-slate-600 bg-slate-50 border border-slate-200',
    amber: 'text-amber-700 bg-amber-50 border border-amber-200'
  };
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
      <p className={cn("px-3 py-1.5 rounded-xl font-bold text-xs inline-block capitalize", colors[color])}>
        {value}
      </p>
    </div>
  );
}
