import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Info } from 'lucide-react';
import { handleFirestoreError } from '../constants';
import { OperationType, City, Route, Brand, Motif } from '../types';

export default function NewExchange() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  
  const [cities, setCities] = useState<City[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [motifs, setMotifs] = useState<Motif[]>([]);

  // Form State
  const [cityId, setCityId] = useState('');
  const [routeId, setRouteId] = useState('');
  const [equipmentType, setEquipmentType] = useState('Celular');
  const [brandId, setBrandId] = useState('');
  const [motifId, setMotifId] = useState('');
  const [price, setPrice] = useState('');
  const [affectedPerson, setAffectedPerson] = useState('');

  useEffect(() => {
    if (!profile) return;
    
    // Fetch options
    const fetchOptions = async () => {
      try {
        const adminGuilds = profile.allowedGuilds ? [profile.guildId, ...profile.allowedGuilds] : [profile.guildId];
        
        // Fetch cities
        const citySnap = await getDocs(query(collection(db, 'cities'), where('guildId', 'in', adminGuilds)));
        setCities(citySnap.docs.map(d => ({ id: d.id, ...d.data() } as City)));

        // Fetch brands
        const brandSnap = await getDocs(query(collection(db, 'brands'), where('guildId', 'in', adminGuilds)));
        setBrands(brandSnap.docs.map(d => ({ id: d.id, ...d.data() } as Brand)));

        // Fetch motifs
        const motifSnap = await getDocs(query(collection(db, 'motifs'), where('guildId', 'in', adminGuilds)));
        setMotifs(motifSnap.docs.map(d => ({ id: d.id, ...d.data() } as Motif)));
      } catch (e) {
        console.error(e);
      }
    };
    fetchOptions();
  }, [profile]);

  useEffect(() => {
    const fetchRoutes = async () => {
      if (!cityId) {
        setRoutes([]);
        return;
      }
      try {
        const routeSnap = await getDocs(query(collection(db, 'routes'), where('cityId', '==', cityId)));
        const sortedRoutes = routeSnap.docs.map(d => ({ id: d.id, ...d.data() } as Route)).sort((a,b) => (a.name || '').localeCompare(b.name || ''));
        setRoutes(sortedRoutes);
      } catch (e) {
        console.error(e);
      }
    };
    fetchRoutes();
  }, [cityId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !cityId || !routeId || !brandId || !motifId || !affectedPerson) return;

    setSubmitting(true);
    try {
      const city = cities.find(c => c.id === cityId);
      const route = routes.find(r => r.id === routeId);
      const brand = brands.find(b => b.id === brandId);
      const motif = motifs.find(m => m.id === motifId);

      await addDoc(collection(db, 'equipment_exchanges'), {
        guildId: profile.guildId, // Use primary guild for now
        cityId,
        cityName: city?.name || '',
        routeId,
        routeName: route?.name || '',
        equipmentType,
        brandId,
        brandName: brand?.name || '',
        motifId,
        motifName: motif?.name || '',
        price: price ? parseFloat(price) : null,
        userId: profile.uid,
        userName: profile.displayName || profile.email,
        userEmail: profile.email,
        affectedPerson,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      navigate('/exchanges');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'equipment_exchanges');
      alert('Error al guardar el registro');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBrands = brands.filter(b => b.type === equipmentType);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button 
        onClick={() => navigate('/exchanges')}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-medium text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Cambios
      </button>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Registrar Cambio de Equipo</h1>
          <p className="text-slate-500">Documenta la entrega y genera la responsiva.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sucursal / Ciudad</label>
              <select 
                value={cityId}
                onChange={e => setCityId(e.target.value)}
                required
                className="w-full bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm font-medium text-slate-900 hover:border-slate-200 focus:border-primary-500 focus:bg-white focus:ring-0 transition-all outline-none"
              >
                <option value="">Selecciona Ciudad</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ruta</label>
              <select 
                value={routeId}
                onChange={e => setRouteId(e.target.value)}
                required
                disabled={!cityId}
                className="w-full bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm font-medium text-slate-900 hover:border-slate-200 focus:border-primary-500 focus:bg-white focus:ring-0 transition-all outline-none disabled:opacity-50"
              >
                <option value="">Selecciona Ruta</option>
                {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Afectado / Persona que recibe</label>
            <input 
              type="text" 
              required
              value={affectedPerson}
              onChange={e => setAffectedPerson(e.target.value)}
              placeholder="Nombre del rutero o responsable..."
              className="w-full bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm font-medium text-slate-900 hover:border-slate-200 focus:border-primary-500 focus:bg-white focus:ring-0 transition-all outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo de Equipo</label>
              <select 
                value={equipmentType}
                onChange={e => {
                  setEquipmentType(e.target.value);
                  setBrandId(''); // reset brand
                }}
                className="w-full bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm font-medium text-slate-900 hover:border-slate-200 focus:border-primary-500 focus:bg-white focus:ring-0 transition-all outline-none"
              >
                <option value="Celular">Celular</option>
                <option value="Impresora Térmica">Impresora Térmica</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Marca / Modelo</label>
              <select 
                value={brandId}
                onChange={e => setBrandId(e.target.value)}
                required
                className="w-full bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm font-medium text-slate-900 hover:border-slate-200 focus:border-primary-500 focus:bg-white focus:ring-0 transition-all outline-none"
              >
                <option value="">Selecciona Marca</option>
                {filteredBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Motivo de Cambio</label>
              <select 
                value={motifId}
                onChange={e => setMotifId(e.target.value)}
                required
                className="w-full bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm font-medium text-slate-900 hover:border-slate-200 focus:border-primary-500 focus:bg-white focus:ring-0 transition-all outline-none"
              >
                <option value="">Selecciona Motivo</option>
                {motifs.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Valor Declarado (Op.)</label>
              <input 
                type="number" 
                step="0.01"
                min="0"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="$0.00"
                className="w-full bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm font-medium text-slate-900 hover:border-slate-200 focus:border-primary-500 focus:bg-white focus:ring-0 transition-all outline-none"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/exchanges')}
              className="px-6 py-3 font-bold text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition-colors uppercase tracking-widest"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-primary-500/20 disabled:opacity-50 uppercase tracking-widest"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Guardar y Generar PDF
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
