import { useState, useEffect } from 'react';
import { User, Mail, MapPin, Shield, CreditCard, Bell, LogOut, Camera, ChevronRight } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { logout, db, auth } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';

interface ProfileProps {
  user: any;
}

export default function Profile({ user }: ProfileProps) {
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [home, setHome] = useState('');
  const [work, setWork] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPlaces, setIsSavingPlaces] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.uid) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setHome(data.savedPlaces?.home || '');
          setWork(data.savedPlaces?.work || '');
        }
      }
    };
    fetchUserData();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!auth.currentUser) return;
    setIsSaving(true);
    try {
      await updateProfile(auth.currentUser, { displayName });
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { displayName });
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePlaces = async () => {
    if (!auth.currentUser) return;
    setIsSavingPlaces(true);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        savedPlaces: { home, work }
      });
      alert('Saved places updated!');
    } catch (err) {
      console.error('Error updating places:', err);
      alert('Failed to update saved places.');
    } finally {
      setIsSavingPlaces(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-violet-600 dark:from-cyan-400 dark:to-violet-400">Profile Settings</h1>
        <Button variant="ghost" className="text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-300 rounded-2xl font-black transition-colors" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      {/* Profile Header */}
      <Card variant="glass" className="flex flex-col items-center space-y-4 p-8 text-center md:flex-row md:space-y-0 md:space-x-8 md:text-left border-neutral-200 dark:border-white/10 bg-white/80 dark:bg-black/40 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_0_40px_rgba(139,92,246,0.05)]">
        <div className="relative">
          <div className="h-24 w-24 overflow-hidden rounded-3xl border-4 border-neutral-100 dark:border-white/10 bg-neutral-100 dark:bg-neutral-900 shadow-[0_0_20px_rgba(6,182,212,0.1)] dark:shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            <img
              src={user?.photoURL || `https://picsum.photos/seed/${user?.uid}/200/200`}
              alt="Profile"
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <button className="absolute -bottom-2 -right-2 rounded-xl bg-cyan-500 p-2.5 text-white dark:text-black shadow-[0_0_15px_rgba(6,182,212,0.3)] dark:shadow-[0_0_15px_rgba(6,182,212,0.6)] hover:bg-cyan-400 transition-all active:scale-90">
            <Camera className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-1">
          <h2 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">{user?.displayName}</h2>
          <p className="text-neutral-500 dark:text-white/60 font-medium">{user?.email}</p>
          <div className="flex flex-wrap justify-center gap-2 pt-2 md:justify-start">
            <span className="rounded-full bg-violet-100 dark:bg-violet-500/20 px-3 py-1 text-[10px] font-black text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30 uppercase tracking-widest shadow-[inset_0_0_10px_rgba(139,92,246,0.1)] dark:shadow-[inset_0_0_10px_rgba(139,92,246,0.2)]">Premium Member</span>
            <span className="rounded-full bg-cyan-100 dark:bg-cyan-500/20 px-3 py-1 text-[10px] font-black text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30 uppercase tracking-widest shadow-[inset_0_0_10px_rgba(6,182,212,0.1)] dark:shadow-[inset_0_0_10px_rgba(6,182,212,0.2)]">Verified</span>
          </div>
        </div>
        <Button variant="outline" className="rounded-2xl font-black border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-900 dark:text-white transition-colors">Edit Photo</Button>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Personal Info */}
        <Card variant="glass" className="space-y-6 p-8 border-neutral-200 dark:border-white/10 bg-white/80 dark:bg-black/40 backdrop-blur-2xl rounded-[2rem] shadow-[0_0_30px_rgba(6,182,212,0.05)]">
          <div className="flex items-center space-x-3 border-b border-neutral-200 dark:border-white/10 pb-4">
            <div className="rounded-xl bg-cyan-100 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 p-2 shadow-[inset_0_0_10px_rgba(6,182,212,0.05)] dark:shadow-[inset_0_0_10px_rgba(6,182,212,0.1)]">
              <User className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <h3 className="font-black text-neutral-900 dark:text-white tracking-tight">Personal Info</h3>
          </div>
          <div className="space-y-4">
            <Input 
              label="Display Name" 
              value={displayName} 
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-neutral-100 dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white focus:border-cyan-500 focus:ring-cyan-500/20" 
            />
            <Input label="Email Address" value={user?.email} disabled className="bg-neutral-100 dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-500 dark:text-white/50 opacity-50" />
          </div>
          <Button 
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="w-full h-14 rounded-2xl font-black bg-cyan-500 hover:bg-cyan-400 text-white dark:text-black shadow-[0_0_15px_rgba(6,182,212,0.2)] dark:shadow-[0_0_15px_rgba(6,182,212,0.4)] disabled:opacity-50 transition-all"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Card>

        {/* Saved Places */}
        <Card variant="glass" className="space-y-6 p-8 border-neutral-200 dark:border-white/10 bg-white/80 dark:bg-black/40 backdrop-blur-2xl rounded-[2rem] shadow-[0_0_30px_rgba(139,92,246,0.05)]">
          <div className="flex items-center space-x-3 border-b border-neutral-200 dark:border-white/10 pb-4">
            <div className="rounded-xl bg-violet-100 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 p-2 shadow-[inset_0_0_10px_rgba(139,92,246,0.05)] dark:shadow-[inset_0_0_10px_rgba(139,92,246,0.1)]">
              <MapPin className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="font-black text-neutral-900 dark:text-white tracking-tight">Saved Places</h3>
          </div>
          <div className="space-y-4">
            <div className="relative">
              <Input 
                label="Home" 
                placeholder="Set home address" 
                value={home}
                onChange={(e) => setHome(e.target.value)}
                className="bg-neutral-100 dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white focus:border-violet-500 focus:ring-violet-500/20" 
              />
            </div>
            <div className="relative">
              <Input 
                label="Work" 
                placeholder="Set work address" 
                value={work}
                onChange={(e) => setWork(e.target.value)}
                className="bg-neutral-100 dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white focus:border-violet-500 focus:ring-violet-500/20" 
              />
            </div>
            <Button 
              onClick={handleSavePlaces}
              disabled={isSavingPlaces}
              variant="outline"
              className="w-full h-14 rounded-2xl font-black border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-900 dark:text-white transition-colors disabled:opacity-50"
            >
              {isSavingPlaces ? 'Updating...' : 'Update Places'}
            </Button>
          </div>
        </Card>

        {/* Security */}
        <Card variant="glass" className="space-y-6 p-8 border-neutral-200 dark:border-white/10 bg-white/80 dark:bg-black/40 backdrop-blur-2xl rounded-[2rem] shadow-[0_0_30px_rgba(245,158,11,0.05)]">
          <div className="flex items-center space-x-3 border-b border-neutral-200 dark:border-white/10 pb-4">
            <div className="rounded-xl bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-2 shadow-[inset_0_0_10px_rgba(245,158,11,0.05)] dark:shadow-[inset_0_0_10px_rgba(245,158,11,0.1)]">
              <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="font-black text-neutral-900 dark:text-white tracking-tight">Security</h3>
          </div>
          <div className="space-y-2">
            <Button variant="ghost" className="w-full justify-between px-4 h-14 rounded-2xl hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-900 dark:text-white transition-colors">
              <span className="font-bold text-sm">Privacy Settings</span>
              <ChevronRight className="h-4 w-4 text-neutral-400 dark:text-white/40" />
            </Button>
            <Button variant="ghost" className="w-full justify-between px-4 h-14 rounded-2xl hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-900 dark:text-white transition-colors">
              <span className="font-bold text-sm">Two-Factor Auth</span>
              <span className="text-[10px] font-black text-rose-500 dark:text-rose-400 uppercase tracking-widest">Disabled</span>
            </Button>
          </div>
        </Card>

        {/* Notifications */}
        <Card variant="glass" className="space-y-6 p-8 border-neutral-200 dark:border-white/10 bg-white/80 dark:bg-black/40 backdrop-blur-2xl rounded-[2rem] shadow-[0_0_30px_rgba(16,185,129,0.05)]">
          <div className="flex items-center space-x-3 border-b border-neutral-200 dark:border-white/10 pb-4">
            <div className="rounded-xl bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-2 shadow-[inset_0_0_10px_rgba(16,185,129,0.05)] dark:shadow-[inset_0_0_10px_rgba(16,185,129,0.1)]">
              <Bell className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="font-black text-neutral-900 dark:text-white tracking-tight">Notifications</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-sm font-bold text-neutral-700 dark:text-white/80">Push Notifications</span>
              <div className="h-6 w-11 rounded-full bg-cyan-500 p-1 cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.2)] dark:shadow-[0_0_10px_rgba(6,182,212,0.4)]">
                <div className="h-4 w-4 translate-x-5 rounded-full bg-white transition-transform shadow-sm" />
              </div>
            </div>
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-sm font-bold text-neutral-700 dark:text-white/80">Email Updates</span>
              <div className="h-6 w-11 rounded-full bg-neutral-200 dark:bg-white/10 p-1 cursor-pointer border border-neutral-300 dark:border-white/10">
                <div className="h-4 w-4 rounded-full bg-white dark:bg-white/40 transition-transform shadow-sm" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
