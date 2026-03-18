import React, { useState, useEffect } from 'react';
import { Car, ArrowRight, Phone, KeyRound } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { APP_NAME } from '../constants';
import { auth, db } from '../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

export default function Auth() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    // Initialize Recaptcha
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        }
      });
    }
  }, []);

  const handleSendCode = async () => {
    if (!phoneNumber) {
      setError('Please enter a valid phone number.');
      return;
    }
    
    setError('');
    setLoading(true);
    try {
      // Ensure phone number has country code, default to Jordan (+962) if not provided
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+962${phoneNumber.replace(/^0+/, '')}`;
      
      const appVerifier = window.recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
    } catch (err: any) {
      console.error('Error sending code:', err);
      setError(err.message || 'Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || !confirmationResult) {
      setError('Please enter the verification code.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const result = await confirmationResult.confirm(verificationCode);
      const user = result.user;

      // Sync user to Firestore
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          phoneNumber: user.phoneNumber,
          displayName: `User ${user.phoneNumber?.slice(-4)}`,
          createdAt: new Date().toISOString(),
          savedPlaces: { home: '', work: '' }
        });
      }
    } catch (err: any) {
      console.error('Error verifying code:', err);
      setError('Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 bg-white dark:bg-black transition-colors duration-300">
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-cyan-500 shadow-[0_0_40px_rgba(6,182,212,0.6)] animate-in zoom-in-50 duration-500">
            <Car className="h-12 w-12 text-black" />
          </div>
          <div className="space-y-2">
            <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">{APP_NAME}</h1>
            <p className="text-neutral-600 dark:text-white/60 font-medium">
              The premium way to move around Amman.
            </p>
          </div>
        </div>

        <Card variant="glass" className="space-y-8 p-10 border-neutral-200 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_0_50px_rgba(139,92,246,0.1)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
          
          <div className="space-y-2 text-center relative z-10">
            <h2 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">Welcome</h2>
            <p className="text-sm text-neutral-500 dark:text-white/40 font-medium">
              {confirmationResult ? 'Enter the verification code' : 'Sign in with your phone number'}
            </p>
          </div>

          {error && (
            <div className="rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-500 dark:text-rose-400 border border-rose-500/20 font-medium text-center shadow-[inset_0_0_10px_rgba(244,63,94,0.2)] relative z-10">
              {error}
            </div>
          )}

          <div className="space-y-4 relative z-10">
            {!confirmationResult ? (
              <>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-neutral-400 dark:text-white/40" />
                  </div>
                  <Input
                    type="tel"
                    placeholder="Phone Number (e.g. 079...)"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="pl-12 h-14 bg-neutral-100 dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white rounded-2xl"
                  />
                </div>
                <Button 
                  className="w-full h-14 rounded-2xl font-black text-lg bg-neutral-900 dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all active:scale-95 flex items-center justify-center gap-3 group" 
                  onClick={handleSendCode} 
                  isLoading={loading}
                >
                  Send Code
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </>
            ) : (
              <>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-neutral-400 dark:text-white/40" />
                  </div>
                  <Input
                    type="text"
                    placeholder="6-digit code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="pl-12 h-14 bg-neutral-100 dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white rounded-2xl tracking-widest text-center text-lg font-bold"
                    maxLength={6}
                  />
                </div>
                <Button 
                  className="w-full h-14 rounded-2xl font-black text-lg bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white shadow-lg shadow-cyan-500/25 transition-all active:scale-95 flex items-center justify-center gap-3 group" 
                  onClick={handleVerifyCode} 
                  isLoading={loading}
                >
                  Verify & Continue
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <button 
                  onClick={() => {
                    setConfirmationResult(null);
                    setVerificationCode('');
                  }}
                  className="w-full text-center text-sm text-neutral-500 dark:text-white/40 hover:text-neutral-900 dark:hover:text-white transition-colors mt-2"
                >
                  Use a different phone number
                </button>
              </>
            )}
          </div>

          <div id="recaptcha-container"></div>

          <p className="text-center text-[10px] text-neutral-400 dark:text-white/30 font-black uppercase tracking-widest leading-relaxed relative z-10">
            By continuing, you agree to our <br />
            <span className="text-neutral-600 dark:text-white/50 hover:text-cyan-500 dark:hover:text-cyan-400 cursor-pointer underline underline-offset-4 transition-colors">Terms of Service</span> & <span className="text-neutral-600 dark:text-white/50 hover:text-cyan-500 dark:hover:text-cyan-400 cursor-pointer underline underline-offset-4 transition-colors">Privacy Policy</span>
          </p>
        </Card>
      </div>
    </div>
  );
}
