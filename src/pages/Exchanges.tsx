import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { EquipmentExchange, OperationType } from '../types';
import { handleFirestoreError } from '../constants';
import { Search, ChevronRight, Download, PlusSquare, ArrowLeftRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDate, exportToCSV } from '../lib/utils';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function Exchanges() {
  const { profile, isAdmin } = useAuth();
  const [exchanges, setExchanges] = useState<EquipmentExchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [week, setWeek] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!profile) return;
    
    let q = query(collection(db, 'equipment_exchanges'));
    if (profile.role !== 'superadmin') {
       const allowedGuilds = profile.allowedGuilds ? [profile.guildId, ...profile.allowedGuilds].slice(0, 30) : [profile.guildId];
       q = query(collection(db, 'equipment_exchanges'), where('guildId', 'in', allowedGuilds));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as EquipmentExchange[];
      list.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      setExchanges(list);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'equipment_exchanges'));

    return () => unsubscribe();
  }, [profile, isAdmin]);

  const filteredExchanges = useMemo(() => {
    return exchanges.filter(ex => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (
          !ex.equipmentType.toLowerCase().includes(term) &&
          !ex.brandName.toLowerCase().includes(term) &&
          !ex.userName.toLowerCase().includes(term) &&
          !ex.affectedPerson.toLowerCase().includes(term)
        ) {
          return false;
        }
      }

      if (!ex.createdAt) return true;
      const date = ex.createdAt.toDate ? ex.createdAt.toDate() : new Date(ex.createdAt);
      
      if (date.getMonth() !== month || date.getFullYear() !== year) return false;
      
      if (week !== 'all') {
        const day = date.getDate();
        const issueWeek = Math.min(5, Math.ceil(day / 7)).toString();
        if (issueWeek !== week) return false;
      }
      return true;
    });
  }, [exchanges, searchTerm, month, year, week]);

  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const rows = filteredExchanges.map((ex, idx) => ({
        '#': idx + 1,
        'Fecha': formatDate(ex.createdAt),
        'Empresa/Ciudad': `${ex.cityName} - Ruta ${ex.routeName}`,
        'Quien Reporto': ex.userName,
        'Afectado': ex.affectedPerson,
        'Equipo': ex.equipmentType,
        'Marca': ex.brandName,
        'Motivo': ex.motifName,
        'Precio': ex.price ? `$ ${ex.price}` : '',
      }));
      exportToCSV(rows, 'cambios_equipo');
    } catch (e) {
      console.error(e);
      alert('Error exportando CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintPDF = (ex: EquipmentExchange) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Hoja de Responsiva de Equipo', 14, 20);
    doc.setFontSize(12);
    
    doc.text(`Fecha: ${formatDate(ex.createdAt)}`, 14, 30);
    doc.text(`Afectado / Rutero: ${ex.affectedPerson}`, 14, 40);
    doc.text(`Sucursal/Ruta: ${ex.cityName} - ${ex.routeName}`, 14, 50);
    
    const textLines = doc.splitTextToSize(`Yo ${ex.affectedPerson} me hago responsable del equipo ${ex.equipmentType} marca ${ex.brandName} que se cambió por motivo de: ${ex.motifName}. ${ex.price ? `El cual tiene un valor declarado de $${ex.price}.` : ''}\n\nMe comprometo a cuidar y mantener en buen estado este equipo y devolverlo en las mismas condiciones al ser requerido.`, 180);
    
    doc.text(textLines, 14, 65);

    doc.text('_____________________________', 30, 150);
    doc.text(`Recibe: ${ex.affectedPerson}`, 35, 160);

    doc.text('_____________________________', 110, 150);
    doc.text(`Entrega: ${ex.userName}`, 115, 160);

    doc.save(`Responsiva_${ex.affectedPerson}_${formatDate(ex.createdAt)}.pdf`);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[50vh]">
      <div className="w-8 h-8 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Cambios de Equipo</h1>
          <p className="text-slate-500 font-medium">Registro de entregas y responsivas</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <div className="flex bg-white rounded-2xl border border-slate-200 p-2 shadow-sm gap-2">
             <div className="flex items-center gap-2 px-2">
               <select 
                 value={month} 
                 onChange={e => setMonth(Number(e.target.value))}
                 className="text-xs font-bold text-slate-600 outline-none bg-transparent p-1 cursor-pointer"
               >
                 {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
               </select>
             </div>
             <span className="text-slate-300">|</span>
             <select 
                 value={year} 
                 onChange={e => setYear(Number(e.target.value))}
                 className="text-xs font-bold text-slate-600 outline-none bg-transparent p-1 cursor-pointer"
               >
                 <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                 <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
             </select>
             <span className="text-slate-300">|</span>
             <select 
                 value={week} 
                 onChange={e => setWeek(e.target.value)}
                 className="text-xs font-bold text-blue-600 outline-none bg-transparent p-1 cursor-pointer"
               >
                 <option value="all">Todas</option>
                 <option value="1">Semana 1</option>
                 <option value="2">Semana 2</option>
                 <option value="3">Semana 3</option>
                 <option value="4">Semana 4</option>
                 <option value="5">Semana 5</option>
             </select>
          </div>

          <div className="flex bg-white rounded-2xl border border-slate-200 p-1 shadow-sm gap-1">
            <div className="relative flex items-center px-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3" />
              <input 
                type="text" 
                placeholder="Buscar..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-4 py-1.5 text-xs font-medium bg-transparent outline-none w-24 border-none ring-0 placeholder:text-slate-400"
              />
            </div>
          </div>
          <button 
            onClick={handleExportCSV}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors whitespace-nowrap"
          >
            {isExporting ? <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent animate-spin rounded-full" /> : <Download className="w-4 h-4" />}
            <span className="hidden lg:inline">Exportar CSV</span>
          </button>
          <Link 
            to="/new-exchange"
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <PlusSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo Registro</span>
            <span className="sm:hidden">Nuevo</span>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-400 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Responsable</th>
                <th className="px-6 py-4">Equipo</th>
                <th className="px-6 py-4">Ubicación</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4 text-right">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence>
                {filteredExchanges.map((ex) => (
                  <motion.tr 
                    key={ex.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{ex.affectedPerson}</div>
                      <div className="text-xs text-slate-500">Rep: {ex.userName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-700">{ex.equipmentType} - {ex.brandName}</div>
                      <div className="text-xs text-slate-500">Motivo: {ex.motifName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{ex.cityName}</div>
                      <div className="text-xs text-slate-500">{ex.routeName}</div>
                    </td>
                    <td className="px-6 py-4">
                      {formatDate(ex.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button onClick={() => handlePrintPDF(ex)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg">
                          <Download className="w-4 h-4" />
                       </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filteredExchanges.length === 0 && (
            <div className="p-12 text-center text-slate-400 bg-slate-50">
              <ArrowLeftRight className="w-8 h-8 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No hay registros en este periodo.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
