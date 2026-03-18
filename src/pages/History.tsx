import { useState, useEffect } from 'react';
import { History as HistoryIcon, MapPin, Calendar, ChevronRight } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { db, auth } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

export default function History() {
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'rides'),
      where('uid', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ridesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRides(ridesData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching rides:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-JO', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
    } catch (e) {
      return dateStr;
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('en-JO', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-violet-600 dark:from-cyan-400 dark:to-violet-400">Ride History</h1>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" className="border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-900 dark:text-white transition-colors rounded-xl">Filter</Button>
          <Button variant="outline" size="sm" className="border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-900 dark:text-white transition-colors rounded-xl">Export</Button>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
          </div>
        ) : rides.length === 0 ? (
          <Card variant="glass" className="p-12 text-center text-neutral-500 dark:text-white/40 font-medium border-neutral-200 dark:border-white/10 bg-white/80 dark:bg-black/40 backdrop-blur-2xl rounded-3xl">
            No rides yet. Start your first journey!
          </Card>
        ) : (
          rides.map((ride) => (
            <Card key={ride.id} variant="glass" className="group cursor-pointer hover:border-cyan-500/50 transition-all border-neutral-200 dark:border-white/10 bg-white/80 dark:bg-black/40 backdrop-blur-2xl rounded-3xl p-6 shadow-[0_0_30px_rgba(6,182,212,0.05)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col items-center space-y-1">
                    <div className="h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
                    <div className="h-4 w-px bg-neutral-300 dark:bg-white/20" />
                    <div className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-neutral-900 dark:text-white">{ride.pickup} → {ride.destination}</p>
                    <div className="flex items-center space-x-3 text-xs text-neutral-500 dark:text-white/40 font-medium">
                      <span className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(ride.createdAt)}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <HistoryIcon className="h-3 w-3" />
                        <span>{formatTime(ride.createdAt)}</span>
                      </span>
                      {ride.type && (
                        <span className="rounded-full bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 px-2 py-0.5 text-[10px] uppercase font-black text-neutral-600 dark:text-white/60 tracking-widest">
                          {ride.type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <p className="font-black text-neutral-900 dark:text-white">{ride.price} JOD</p>
                    <p className={`text-[10px] uppercase font-black tracking-widest ${
                      ride.status === 'Cancelled' ? 'text-rose-500 dark:text-rose-400' : 
                      ride.status === 'Active' ? 'text-cyan-600 dark:text-cyan-400 animate-pulse drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 
                      ride.status === 'Scheduled' ? 'text-amber-500 dark:text-amber-400' :
                      'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {ride.status}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-neutral-400 dark:text-white/40 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors" />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
