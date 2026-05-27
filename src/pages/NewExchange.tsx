import React, { useState, useEffect } from 'react';
import { collection, addDoc, setDoc, doc, serverTimestamp, getDocs, query, where, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Info } from 'lucide-react';
import { handleFirestoreError } from '../constants';
import { OperationType, City, Route, Motif, Asset } from '../types';

export default function NewExchange() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  
  const [cities, setCities] = useState<City[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [motifs, setMotifs] = useState<Motif[]>([]);
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);

  // Form State
  const [cityId, setCityId] = useState('');
  const [routeId, setRouteId] = useState('');
  const [motifId, setMotifId] = useState('');
  const [price, setPrice] = useState('');
  const [affectedPerson, setAffectedPerson] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState('');

  useEffect(() => {
    if (!profile) return;
    
    // Fetch options
    const fetchOptions = async () => {
      try {
        const adminGuilds = Array.from(new Set([profile.guildId, ...(profile.allowedGuilds || [])])).filter(Boolean).slice(0, 30);
        
        // Fetch cities
        const citySnap = await getDocs(query(collection(db, 'cities'), where('guildId', 'in', adminGuilds)));
        setCities(citySnap.docs.map(d => ({ id: d.id, ...d.data() } as City)).sort((a,b) => (a.name || '').localeCompare(b.name || '')));

        // Fetch motifs
        const motifSnap = await getDocs(query(collection(db, 'motifs'), where('guildId', 'in', adminGuilds)));
        setMotifs(motifSnap.docs.map(d => ({ id: d.id, ...d.data() } as Motif)).sort((a,b) => (a.name || '').localeCompare(b.name || '')));

        // Fetch available assets
        const assetsSnap = await getDocs(query(collection(db, 'assets'), where('guildId', 'in', adminGuilds), where('status', '==', 'available')));
        setAvailableAssets(assetsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Asset)));

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
    if (!profile || !cityId || !routeId || !selectedAssetId || !motifId || !affectedPerson) return;

    setSubmitting(true);
    try {
      const city = cities.find(c => c.id === cityId);
      const route = routes.find(r => r.id === routeId);
      const motif = motifs.find(m => m.id === motifId);
      const asset = availableAssets.find(a => a.id === selectedAssetId);

      if (!asset) {
         setSubmitting(false);
         alert("Por favor selecciona un activo válido del inventario.");
         return;
      }

      const batch = writeBatch(db);

      // 1. Registrar Cambio de Equipo
      const exchangeRef = doc(collection(db, 'equipment_exchanges'));
      batch.set(exchangeRef, {
        guildId: asset.guildId || profile.guildId || '',
        cityId: cityId || '',
        cityName: city?.name || '',
        routeId: routeId || '',
        routeName: route?.name || '',
        equipmentType: asset.type || '',
        brandId: asset.brandId || '',
        brandName: asset.brandName || '',
        motifId: motifId || '',
        motifName: motif?.name || '',
        newEquipment: asset.uid || '',
        price: price ? parseFloat(price) : null,
        userId: profile.uid || '',
        userName: profile.displayName || profile.email || '',
        userEmail: profile.email || '',
        affectedPerson: affectedPerson || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2. Sobreescribir o crear la responsiva para la ruta
      const responsivaRef = doc(db, 'route_responsivas', routeId);
      batch.set(responsivaRef, {
        guildId: asset.guildId || profile.guildId || '',
        cityId: cityId || '',
        cityName: city?.name || '',
        routeId: routeId || '',
        routeName: route?.name || '',
        equipmentType: asset.type || '',
        brandName: asset.brandName || '',
        newEquipment: asset.uid || '',
        userId: profile.uid || '',
        userName: profile.displayName || profile.email || '',
        affectedPerson: affectedPerson || '',
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 3. Actualizar estado del activo (Asset) a "asignado"
      const assetRef = doc(db, 'assets', selectedAssetId);
      batch.update(assetRef, {
        guildId: asset.guildId || profile.guildId || '',
        status: 'assigned',
        currentRouteId: routeId || '',
        currentRouteName: route?.name || '',
        currentCityId: cityId || '',
        currentCityName: city?.name || '',
        currentSupervisor: affectedPerson || '',
        updatedAt: serverTimestamp()
      });

      // 4. Registrar transacción del activo (Assignment)
      const txRef = doc(collection(db, 'asset_transactions'));
      batch.set(txRef, {
        guildId: asset.guildId || profile.guildId || '',
        assetId: asset.id || '',
        assetUid: asset.uid || '',
        assetType: asset.type || '',
        type: 'assignment',
        fromStatus: 'available',
        toStatus: 'assigned',
        routeId: routeId || '',
        routeName: route?.name || '',
        supervisorName: affectedPerson || '',
        notes: `Asignado por cambio (Motivo: ${motif?.name || ''})`,
        recordedBy: profile.uid || '',
        recordedByName: profile.displayName || profile.email || '',
        createdAt: serverTimestamp()
      });

      await batch.commit();

      navigate('/exchanges');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.CREATE, 'equipment_exchanges');
      alert('Error al guardar el registro y asignar inventario: ' + (error?.message || 'Error desconocido'));
    } finally {
      setSubmitting(false);
    }
  };

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
          <p className="text-slate-500">Asigna un equipo del inventario y genera la responsiva.</p>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre del Asesor</label>
              <input 
                type="text" 
                required
                value={affectedPerson}
                onChange={e => setAffectedPerson(e.target.value)}
                placeholder="Nombre del Asesor..."
                className="w-full bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm font-medium text-slate-900 hover:border-slate-200 focus:border-primary-500 focus:bg-white focus:ring-0 transition-all outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Equipo a Entregar (Disponible)</label>
              <select
                value={selectedAssetId}
                onChange={e => setSelectedAssetId(e.target.value)}
                required
                className="w-full bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm font-medium text-slate-900 hover:border-slate-200 focus:border-primary-500 focus:bg-white focus:ring-0 transition-all outline-none"
              >
                <option value="">Selecciona Inventario Disponible</option>
                {availableAssets.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.type} - {a.brandName || a.model} (S/N: {a.uid})
                  </option>
                ))}
              </select>
              {availableAssets.length === 0 && (
                 <p className="text-xs text-red-500 font-bold mt-1">No hay equipos disponibles en inventario.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              disabled={submitting || availableAssets.length === 0}
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
