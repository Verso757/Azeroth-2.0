import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError } from '../constants';
import { OperationType } from '../types';

export const migrateMochisRoutes = async (guildId: string) => {
  // Find Mochis
  let cityId = '';
  try {
    const qCity = query(collection(db, 'cities'), where('guildId', '==', guildId));
    const citiesSnap = await getDocs(qCity);
    const mochisDoc = citiesSnap.docs.find(d => d.data().name?.toLowerCase().includes('mochis'));
    
    if (mochisDoc) {
      cityId = mochisDoc.id;
    } else {
      // Create mochis if not exists
      const newCityRef = await addDoc(collection(db, 'cities'), {
        name: 'Mochis',
        guildId,
        createdAt: serverTimestamp()
      });
      cityId = newCityRef.id;
    }

    // Add routes 101 to 135
    let addedCount = 0;
    for(let i = 101; i <= 135; i++) {
        await addDoc(collection(db, 'routes'), {
          name: i.toString(),
          cityId,
          guildId,
          createdAt: serverTimestamp()
        });
        addedCount++;
    }
    
    alert(`Migración completada. Se añadieron ${addedCount} rutas a Mochis.`);
    
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'routes');
    alert('Error en la migración. Chequea consola.');
  }
};
