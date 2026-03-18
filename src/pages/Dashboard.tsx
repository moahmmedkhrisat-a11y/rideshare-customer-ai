import { useState, useEffect } from 'react';
import { LayoutDashboard, TrendingUp, Star, MapPin, DollarSign, Calendar, Car } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { db, auth } from '../firebase';
import { collection, query, where, orderBy, limit, onSnapshot, doc, deleteDoc } from 'firebase/firestore';

export default function Dashboard() {
  const [recentRides, setRecentRides] = useState<any[]>([]);
  const [allRides, setAllRides] = useState<any[]>([]);
  const [scheduledRides, setScheduledRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fetch all rides for stats
    const allRidesQuery = query(
      collection(db, 'rides'),
      where('uid', '==', auth.currentUser.uid)
    );

    const unsubscribeAll = onSnapshot(allRidesQuery, (snapshot) => {
      const ridesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setAllRides(ridesData);
      setRecentRides(ridesData.filter((r: any) => r.status !== 'Scheduled').sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 3));
      setScheduledRides(ridesData.filter((r: any) => r.status === 'Scheduled'));
      setLoading(false);
    });

    return () => unsubscribeAll();
  }, []);

  const handleDeleteScheduled = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'rides', id));
    } catch (err) {
      alert('Failed to delete scheduled trip');
    }
  };

  const totalSpent = allRides.reduce((acc, ride) => acc + (parseFloat(ride.price) || 0), 0);
  const totalRides = allRides.filter(r => r.status === 'Completed').length;

  const stats = [
    { label: 'Total Rides', value: totalRides.toString(), icon: LayoutDashboard, color: 'text-cyan-600 dark:text-cyan-400' },
    { label: 'Rating', value: '4.9', icon: Star, color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Total Spent', value: `${totalSpent.toFixed(2)} JOD`, icon: DollarSign, color: 'text-violet-600 dark:text-violet-400' },
    { label: 'Distance', value: `${(totalRides * 5.4).toFixed(1)} km`, icon: TrendingUp, color: 'text-rose-600 dark:text-rose-400' },
  ];

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-JO', { day: 'numeric', month: 'short' });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-violet-600 dark:from-cyan-400 dark:to-violet-400">Dashboard</h1>
          <p className="text-neutral-500 dark:text-white/60 font-medium">Welcome back, {auth.currentUser?.displayName?.split(' ')[0] || 'User'}!</p>
        </div>
        <Button variant="outline" className="hidden md:flex border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-900 dark:text-white transition-colors rounded-xl">Download Report</Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} variant="glass" className="space-y-2 border-neutral-200 dark:border-white/10 bg-white/80 dark:bg-black/40 backdrop-blur-2xl hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors rounded-3xl p-6 shadow-[0_0_30px_rgba(139,92,246,0.05)]">
              <div className={`rounded-2xl bg-neutral-100 dark:bg-white/5 p-3 w-fit border border-neutral-200 dark:border-white/5 shadow-inner ${stat.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="pt-2">
                <p className="text-[10px] font-black text-neutral-500 dark:text-white/40 uppercase tracking-widest">{stat.label}</p>
                <p className="text-3xl font-black text-neutral-900 dark:text-white mt-1">{stat.value}</p>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-8">
          <Card variant="glass" className="space-y-6 border-neutral-200 dark:border-white/10 bg-white/80 dark:bg-black/40 backdrop-blur-2xl rounded-3xl p-6 shadow-[0_0_30px_rgba(6,182,212,0.05)]">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-white/10 pb-4">
              <h2 className="text-xl font-black text-neutral-900 dark:text-white">Recent Activity</h2>
              <Button variant="ghost" size="sm" className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 rounded-xl">View All</Button>
            </div>
            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
                </div>
              ) : recentRides.length === 0 ? (
                <p className="text-center py-8 text-neutral-500 dark:text-white/40 font-medium">No recent activity</p>
              ) : (
                recentRides.map((ride) => (
                  <div key={ride.id} className="flex items-center justify-between border-b border-neutral-200 dark:border-white/5 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center space-x-4">
                      <div className="rounded-2xl bg-neutral-100 dark:bg-white/5 p-3 border border-neutral-200 dark:border-white/5">
                        <MapPin className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <div>
                        <p className="font-bold text-neutral-900 dark:text-white truncate max-w-[150px] md:max-w-xs">{ride.destination}</p>
                        <p className="text-xs text-neutral-500 dark:text-white/40 font-medium">{formatDate(ride.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-neutral-900 dark:text-white">{ride.price} JOD</p>
                      <p className={`text-[10px] uppercase font-black tracking-widest ${
                        ride.status === 'Cancelled' ? 'text-rose-500 dark:text-rose-400' : 
                        ride.status === 'Active' ? 'text-cyan-600 dark:text-cyan-400 animate-pulse drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 
                        'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {ride.status}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card variant="glass" className="space-y-6 border-neutral-200 dark:border-white/10 bg-white/80 dark:bg-black/40 backdrop-blur-2xl rounded-3xl p-6 shadow-[0_0_30px_rgba(139,92,246,0.05)]">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-white/10 pb-4">
              <h2 className="text-xl font-black text-neutral-900 dark:text-white">Scheduled Trips</h2>
              <div className="rounded-full bg-violet-100 dark:bg-violet-500/20 border border-violet-200 dark:border-violet-500/30 px-3 py-1 text-[10px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest shadow-[inset_0_0_10px_rgba(139,92,246,0.1)] dark:shadow-[inset_0_0_10px_rgba(139,92,246,0.2)]">Recurring</div>
            </div>
            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent shadow-[0_0_15px_rgba(139,92,246,0.5)]" />
                </div>
              ) : scheduledRides.length === 0 ? (
                <p className="text-center py-8 text-neutral-500 dark:text-white/40 font-medium">No scheduled trips</p>
              ) : (
                scheduledRides.map((ride) => (
                  <div key={ride.id} className="flex items-center justify-between border-b border-neutral-200 dark:border-white/5 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center space-x-4">
                      <div className="rounded-2xl bg-violet-100 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 p-3">
                        <Calendar className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div>
                        <p className="font-bold text-neutral-900 dark:text-white truncate max-w-[150px] md:max-w-xs">{ride.pickup} → {ride.destination}</p>
                        <p className="text-xs text-neutral-500 dark:text-white/40 font-medium">
                          {ride.scheduleTime} • {ride.scheduleDays?.join(', ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right hidden sm:block">
                        <p className="font-black text-neutral-900 dark:text-white">{ride.price} JOD</p>
                        <p className="text-[10px] text-violet-600 dark:text-violet-400 uppercase font-black tracking-widest">{ride.status}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors" onClick={() => handleDeleteScheduled(ride.id)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Driver Promotion */}
        <Card className="bg-gradient-to-br from-cyan-100 to-violet-100 dark:from-cyan-500/20 dark:to-violet-500/20 border border-neutral-200 dark:border-white/10 p-8 text-neutral-900 dark:text-white flex flex-col justify-between rounded-3xl shadow-[0_0_40px_rgba(6,182,212,0.15)] backdrop-blur-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="space-y-6 relative z-10">
            <div className="rounded-2xl bg-white/50 dark:bg-white/10 p-4 w-fit border border-white/50 dark:border-white/20 shadow-[inset_0_0_20px_rgba(255,255,255,0.5)] dark:shadow-[inset_0_0_20px_rgba(255,255,255,0.1)]">
              <Car className="h-10 w-10 text-cyan-600 dark:text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
            </div>
            <h2 className="text-3xl font-black leading-tight tracking-tight">Earn money on your own schedule</h2>
            <p className="text-neutral-600 dark:text-white/60 text-sm font-medium leading-relaxed">Become a driver and start earning today. Flexible hours, great pay, and a supportive community.</p>
          </div>
          <Button variant="outline" className="mt-8 h-14 rounded-2xl font-black text-lg border-neutral-300 dark:border-white/20 bg-white/50 dark:bg-white/5 text-neutral-900 dark:text-white hover:bg-white/80 dark:hover:bg-white/10 transition-all relative z-10">
            Apply to Drive
          </Button>
        </Card>
      </div>
    </div>
  );
}
