import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Check, Crown, CreditCard, Shield, Flame, X, Send } from 'lucide-react';
import { 
  getPlansFromFirestore, 
  SubscribePlan, 
  addSubscribeRequestToFirestore, 
  updateUserPremiumStatusInFirestore,
  getPaymentSettingsFromFirestore,
  PaymentSettings
} from '../lib/firestoreService';
import { UserProfile } from '../types';

interface PremiumViewProps {
  currentPremiumStatus: boolean;
  onUpgradeSuccess: (expireDays?: number) => void;
  onClose: () => void;
  currentUser?: UserProfile | null;
  key?: string;
}

const DEFAULT_PLANS = [
  {
    id: 'monthly',
    name: 'PREMIUM PASS',
    period: 'Monthly',
    price: '$9.99',
    benefits: ['Full 4K Ultra HDR Master', 'Dolby Atmos Digital Audio', 'All Premium Exclusives', 'Unlimited High-Speed Downloads'],
    color: 'border-white/10 bg-white/5',
    tag: 'Standard VIP'
  },
  {
    id: 'yearly',
    name: 'ELITE SECTOR',
    period: 'Yearly',
    price: '$79.99',
    benefits: ['Everything in Premium Pass', 'Save 33% Annually', 'Director Commentaries', 'Beta Live TV Access', 'Priority Stream Bandwidth'],
    color: 'border-gold-base/30 bg-gold-base/5 ring-1 ring-gold-base/20',
    tag: 'Most Popular',
    popular: true
  },
  {
    id: 'ep_plex_vip',
    name: 'EP PLEX VIP ACCESS',
    period: 'Lifetime VIP',
    price: '$149.99',
    benefits: ['Ultimate VIP Server Access', 'Zero buffering cinematic relay', 'Early bird screenings & exclusive premiere access', 'Dedicated premium discord guild badge', 'Full Dolby Vision & 8K Resolution Streams'],
    color: 'border-amber-500 bg-amber-500/10 shadow-[0_0_35px_rgba(245,158,11,0.35)] ring-1 ring-amber-500/30',
    tag: 'ULTIMATE VIP',
    popular: false
  },
  {
    id: 'lifetime',
    name: 'INFINITE ROYAL',
    period: 'Lifetime',
    price: '$199.99',
    benefits: ['Eternal Cinematic Access', 'Dedicated VIP Assistance', 'Elite Plex Founder Guild Badge', 'Early Screening Invitations'],
    color: 'border-purple-accent/30 bg-purple-accent/5 shadow-[0_0_25px_rgba(88,28,135,0.25)]',
    tag: 'Legacy VIP'
  }
];

export default function PremiumView({ currentPremiumStatus, onUpgradeSuccess, onClose, currentUser }: PremiumViewProps) {
  const [plans, setPlans] = useState<SubscribePlan[]>(DEFAULT_PLANS);
  const [selectedPlan, setSelectedPlan] = useState('ep_plex_vip');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const getRemainingDaysText = () => {
    if (!currentUser?.premiumExpiry) return "";
    const remaining = currentUser.premiumExpiry - Date.now();
    if (remaining <= 0) return "EXPIRED";
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    return `${days}d ${hours}h ${minutes}m remaining`;
  };

  // Subscribe/Payment Request States
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);

  // Payment Form States
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Admin Payment Config & UPI/Simulation States
  const [adminPaymentSettings, setAdminPaymentSettings] = useState<PaymentSettings | null>(null);
  const [paymentMessage, setPaymentMessage] = useState('');
  const [showUPIModal, setShowUPIModal] = useState(false);
  const [upiTimer, setUpiTimer] = useState(120);
  const [upiStatus, setUpiStatus] = useState<'waiting' | 'paid' | 'cancelled'>('waiting');

  // Simulated Secure Checkout States
  const [activeGateway, setActiveGateway] = useState<'stripe' | 'paypal'>('stripe');
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [gatewayPhase, setGatewayPhase] = useState<'connecting' | 'verifying' | '3ds' | 'capturing' | 'success'>('connecting');
  const [stripe3dsCode, setStripe3dsCode] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [paypalPassword, setPaypalPassword] = useState('');
  const [paypalLogged, setPaypalLogged] = useState(false);

  const handleStripeCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert("Please login first to proceed with premium payment.");
      return;
    }
    setGatewayPhase('connecting');
    setShowGatewayModal(true);
    setStripe3dsCode('');
    
    setTimeout(() => {
      setGatewayPhase('verifying');
      setTimeout(() => {
        setGatewayPhase('3ds');
      }, 1200);
    }, 1000);
  };

  const handleStripe3dsVerify = async () => {
    if (stripe3dsCode !== '1234' && stripe3dsCode.trim() !== '') {
      alert("Invalid verification code. Please enter the simulated code '1234' to authorize.");
      return;
    }
    setGatewayPhase('capturing');
    try {
      const expireDays = selectedPlanDetails?.expireDaysCount || 30;
      if (currentUser && currentUser.id) {
        await updateUserPremiumStatusInFirestore(currentUser.id, true, expireDays);
      }
      setTimeout(() => {
        setGatewayPhase('success');
        setTimeout(() => {
          setShowGatewayModal(false);
          setSuccess(true);
        }, 1500);
      }, 1500);
    } catch (err) {
      console.error("Stripe capture failed:", err);
      alert("Stripe secure gateway error. Please try again.");
      setShowGatewayModal(false);
    }
  };

  const handlePayPalCheckoutSubmit = () => {
    if (!currentUser) {
      alert("Please login first to proceed with premium payment.");
      return;
    }
    setGatewayPhase('connecting');
    setShowGatewayModal(true);
    setPaypalEmail(currentUser?.email || 'guest@example.com');
    setPaypalPassword('');
    setPaypalLogged(false);
    
    setTimeout(() => {
      setGatewayPhase('verifying');
    }, 1200);
  };

  const handlePayPalLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPaypalLogged(true);
    setGatewayPhase('3ds'); // PayPal "Review and Pay" phase
  };

  const handlePayPalCompletePay = async () => {
    setGatewayPhase('capturing');
    try {
      const expireDays = selectedPlanDetails?.expireDaysCount || 30;
      if (currentUser && currentUser.id) {
        await updateUserPremiumStatusInFirestore(currentUser.id, true, expireDays);
      }
      setTimeout(() => {
        setGatewayPhase('success');
        setTimeout(() => {
          setShowGatewayModal(false);
          setSuccess(true);
        }, 1500);
      }, 1500);
    } catch (err) {
      console.error("PayPal capture failed:", err);
      alert("PayPal gateway error. Please try again.");
      setShowGatewayModal(false);
    }
  };

  // Load Admin Payment Config
  useEffect(() => {
    getPaymentSettingsFromFirestore().then((settings) => {
      setAdminPaymentSettings(settings);
    }).catch((err) => {
      console.error("Could not fetch payment settings:", err);
    });
  }, []);

  // UPI Countdown Timer
  useEffect(() => {
    if (!showUPIModal || upiStatus !== 'waiting') return;
    const interval = setInterval(() => {
      setUpiTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleUPICancel();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showUPIModal, upiStatus]);

  const handleInstantUPIPay = () => {
    if (!currentUser) {
      alert("Please login first to proceed with premium payment.");
      return;
    }

    const priceNum = selectedPlanDetails?.price?.replace(/[^0-9.]/g, '') || '9.99';
    const upiId = adminPaymentSettings?.upiId || 'eliteplex@ybl';
    const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=Elite%20Plex&am=${encodeURIComponent(priceNum)}&cu=INR`;

    if (adminPaymentSettings?.paymentType === 'auto') {
      // Automatic deep link launch
      window.location.href = upiUri;
      setUpiStatus('waiting');
      setUpiTimer(120);
      setShowUPIModal(true);
      setPaymentMessage('');
    } else {
      // Manual/Request route fallback
      handleSubmitPaymentRequest();
    }
  };

  const handleUPISuccess = async () => {
    setUpiStatus('paid');
    setLoading(true);
    try {
      const expireDays = selectedPlanDetails?.expireDaysCount || 30;
      if (currentUser && currentUser.id) {
        await updateUserPremiumStatusInFirestore(currentUser.id, true, expireDays);
      }
      setPaymentMessage(`TRANSACTION SUCCESSFUL! ${expireDays} DAYS VIP PREMIUM UNLOCKED!`);
      setTimeout(() => {
        setLoading(false);
        setSuccess(true);
        setShowUPIModal(false);
      }, 1500);
    } catch (err) {
      console.error("Verification failed:", err);
      setPaymentMessage("Verification failed. Please try again.");
      setUpiStatus('waiting');
      setLoading(false);
    }
  };

  const handleUPICancel = () => {
    setUpiStatus('cancelled');
    setPaymentMessage("PAYMENT ERROR: Transaction cancelled or not detected in active ledger.");
    setTimeout(() => {
      setShowUPIModal(false);
    }, 2000);
  };

  // Fetch plans from Firestore
  useEffect(() => {
    let active = true;
    getPlansFromFirestore().then((loadedPlans) => {
      if (active && loadedPlans && loadedPlans.length > 0) {
        setPlans(loadedPlans);
      }
    }).catch((err) => {
      console.error("Could not load plans from firestore, using defaults:", err);
    });
    return () => {
      active = false;
    };
  }, []);

  const handlePurchase = async () => {
    setLoading(true);
    try {
      if (currentUser && currentUser.id) {
        await updateUserPremiumStatusInFirestore(currentUser.id, true);
      }
    } catch (err) {
      console.error("Firestore user upgrade failed:", err);
    }
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        onUpgradeSuccess(selectedPlanDetails?.expireDaysCount || 30);
        onClose();
      }, 2000);
    }, 1800);
  };

  const handleSubmitPaymentRequest = async () => {
    if (!currentUser) {
      alert("Please login first to submit a subscribe/payment request.");
      return;
    }
    setRequestSubmitting(true);
    try {
      await addSubscribeRequestToFirestore({
        userId: currentUser.id,
        name: currentUser.name || 'Anonymous User',
        email: currentUser.email || 'guest@example.com',
        planId: selectedPlan,
        planName: selectedPlanDetails?.name || 'EP PLEX VIP ACCESS',
        status: 'pending',
        createdAt: new Date().toISOString(),
        requestNotes: `Requested subscription activation for ${selectedPlanDetails?.name || 'EP PLEX VIP ACCESS'} via Premium Modal.`
      });
      setRequestSuccess(true);
      setTimeout(() => {
        setRequestSuccess(false);
        onClose();
      }, 2500);
    } catch (err) {
      console.error("Error submitting subscribe request:", err);
      alert("Failed to submit request. Please try again.");
    } finally {
      setRequestSubmitting(false);
    }
  };

  const selectedPlanDetails = plans.find((x) => x.id === selectedPlan) || plans[0];

  return (
    <div className="fixed inset-0 bg-[#070708] text-white z-50 overflow-y-auto w-full h-full flex flex-col font-sans">
      {/* Cinematic Background Atmosphere */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-purple-900/5 to-black pointer-events-none z-0" />
      <div className="absolute top-1/3 right-10 w-96 h-96 gold-radial-glow opacity-15 pointer-events-none z-0" />
      <div className="absolute bottom-10 left-10 w-96 h-96 purple-radial-glow opacity-15 pointer-events-none z-0" />

      {/* Top Premium Navigation Header */}
      <header className="relative z-10 w-full px-6 md:px-12 py-5 border-b border-white/5 bg-black/40 backdrop-blur-md flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer text-xs font-tech font-bold uppercase tracking-wider"
        >
          <X className="w-3.5 h-3.5" />
          EXIT CINEMA PASS
        </button>

        {/* Brand/Portal Identity */}
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-gold-base animate-pulse" />
          <span className="text-sm font-serif font-black tracking-[0.25em] gold-gradient-text uppercase">
            EP PLEX INNER CIRCLE
          </span>
        </div>

        {/* User Account State */}
        <div className="hidden sm:flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-full py-1.5 pl-2 pr-4">
          <img
            src={currentUser?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80"}
            alt={currentUser?.name || "User"}
            className="w-6 h-6 rounded-full object-cover border border-gold-base/30"
          />
          <div className="text-left">
            <span className="text-[9px] font-bold block leading-none text-white">{currentUser?.name || "GUEST"}</span>
            <span className="text-[7px] text-gold-base font-mono tracking-widest uppercase">
              {currentPremiumStatus ? "ACTIVE VIP" : "STANDARD TIER"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 md:px-12 py-10 flex flex-col gap-10">
        <AnimatePresence mode="wait">
          {requestSuccess ? (
            <motion.div
              key="request-success-screener"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="my-auto text-center py-16 flex flex-col items-center gap-6 max-w-lg mx-auto luxury-glass p-12 rounded-[32px] border-gold-base/20 shadow-[0_0_50px_rgba(212,175,55,0.1)]"
            >
              {/* Cinematic golden shine ring */}
              <div className="relative w-24 h-24 flex items-center justify-center mb-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border-2 border-dashed border-gold-base/50 animate-pulse"
                />
                <div className="absolute inset-2 bg-gradient-to-tr from-amber-500 to-yellow-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.6)]">
                  <Send className="w-10 h-10 text-black" />
                </div>
              </div>

              <h3 className="text-2xl font-serif font-black text-amber-500 tracking-wider uppercase">
                REQUEST SUBMITTED
              </h3>
              <p className="text-sm text-white/80 leading-relaxed font-light">
                Your VIP Activation Request for <strong className="text-gold-light font-bold">{selectedPlanDetails?.name}</strong> has been securely registered. Our administrators will verify the ledger and grant access immediately.
              </p>
              
              <div className="w-full h-px bg-white/5 my-2" />
              
              <button
                onClick={onClose}
                className="gold-gradient-bg text-black font-tech font-extrabold text-[10px] tracking-widest py-3 px-8 rounded-xl hover:brightness-110 transition-all cursor-pointer"
              >
                RETURN TO SYSTEM HOME
              </button>
            </motion.div>
          ) : success ? (
            <motion.div
              key="success-screener"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="my-auto text-center py-16 flex flex-col items-center gap-6 max-w-lg mx-auto luxury-glass p-12 rounded-[32px] border-gold-base/20 shadow-[0_0_50px_rgba(212,175,55,0.1)]"
            >
              {/* Cinematic golden shine ring */}
              <div className="relative w-24 h-24 flex items-center justify-center mb-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border-2 border-dashed border-gold-base/50"
                />
                <div className="absolute inset-2 bg-gradient-to-tr from-gold-base to-gold-dark rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.6)]">
                  <Crown className="w-10 h-10 text-black stroke-[2.2px]" />
                </div>
              </div>

              <h3 className="text-2xl font-serif font-bold gold-gradient-text tracking-wide uppercase">
                ACCESS KEY DECRYPTED
              </h3>
              <p className="text-sm text-white/85 leading-relaxed font-light">
                Congratulations! You are now fully certified. The entire database of 4K master streams and 3D audio tracks is unlocked. Your <strong className="text-gold-light font-bold">{selectedPlanDetails?.expireDaysCount || 30} Days</strong> premium countdown timer is now active on your dashboard. Enjoy buffer-free VIP playback!
              </p>

              <button
                onClick={() => {
                  onUpgradeSuccess(selectedPlanDetails?.expireDaysCount || 30);
                  onClose();
                }}
                className="gold-gradient-bg text-black font-tech font-extrabold text-[10px] tracking-widest py-3 px-8 rounded-xl hover:brightness-110 transition-all cursor-pointer mt-4"
              >
                ENTER CINEMATIC ENVELOPE
              </button>
            </motion.div>
          ) : (
            <div key="full-page-subscription-dashboard" className="w-full">
              {!showPaymentForm ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                  {/* Left Column: Plan Selection Grid (Spans 7 cols on large displays) */}
                  <div className="lg:col-span-7 flex flex-col gap-6">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-base/10 border border-gold-base/25 mb-4">
                        <Sparkles className="w-3.5 h-3.5 text-gold-base" />
                        <span className="text-[9px] font-tech font-extrabold tracking-[0.2em] text-gold-base uppercase">
                          VIP SYSTEM UPGRADE
                        </span>
                      </div>
                      <h1 className="text-3xl md:text-4xl font-serif font-black tracking-tight text-white leading-tight">
                        SELECT YOUR MEMBERSHIP TIER
                      </h1>
                      <p className="text-xs text-white/50 max-w-xl mt-2 leading-relaxed">
                        By-pass content buffers, activate ultra bandwidth encoders, and download infinite media keys in 4K HDR. Choose your optimal tier below.
                      </p>
                    </div>

                    {/* Active Premium Access Status Card */}
                    {currentUser?.isPremium && (
                      <div className="p-5 rounded-[24px] bg-gradient-to-r from-amber-500/10 via-gold-base/10 to-amber-500/5 border border-gold-base/30 relative overflow-hidden animate-fade-in">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gold-base/10 rounded-full blur-xl pointer-events-none" />
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gold-base/20 flex items-center justify-center text-gold-base shrink-0">
                            <Crown className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-serif font-black tracking-wider text-gold-light uppercase">
                              Active VIP Access Detected
                            </h4>
                            <p className="text-[10px] text-white/90 font-mono mt-0.5 font-semibold">
                              ⏳ Remaining Time: {getRemainingDaysText() || "Active"}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/5 flex flex-col gap-1">
                          <p className="text-[9px] text-amber-400 font-bold tracking-wide uppercase flex items-center gap-1.5">
                            <Flame className="w-3.5 h-3.5 animate-pulse" />
                            Elite double boost promotion is active!
                          </p>
                          <p className="text-[8px] text-white/50 leading-normal">
                            Subscribing to any tier now will safely add your remaining days to the new subscription and DOUBLE (2x) the purchased duration!
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Plans Deck */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {plans.map((plan, idx) => {
                        const isSelected = selectedPlan === plan.id;
                        const isUltimate = plan.id === 'ep_plex_vip';
                        
                        return (
                          <motion.div
                            whileHover={{ scale: 1.01, y: -2 }}
                            key={`${plan.id}-${idx}`}
                            onClick={() => {
                              setSelectedPlan(plan.id);
                              // Reset payment form step if they switch plans
                              setShowPaymentForm(false);
                            }}
                            className={`p-6 rounded-[28px] border transition-all duration-300 flex flex-col justify-between cursor-pointer relative h-[280px] ${
                              isSelected 
                                ? 'bg-gradient-to-b from-[#181512] to-[#0d0d0f] border-gold-base/60 shadow-[0_15px_40px_rgba(212,175,55,0.15)] ring-1 ring-gold-base/30'
                                : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                            }`}
                          >
                            {/* Plan Header */}
                            <div>
                              <div className="flex items-center justify-between mb-4">
                                <span className={`text-[8px] font-tech font-extrabold px-2.5 py-1 rounded-full tracking-widest uppercase border ${
                                  isUltimate
                                    ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                                    : isSelected
                                    ? 'bg-gold-base/10 border-gold-base/25 text-gold-base'
                                    : 'bg-white/5 border-white/5 text-white/40'
                                }`}>
                                  {plan.tag || 'VIP TIER'}
                                </span>
                                
                                {/* Checkbox indicator */}
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                  isSelected ? 'bg-gold-base border-gold-base text-black' : 'border-white/20'
                                }`}>
                                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                                </div>
                              </div>

                              <h3 className="text-base font-serif font-black tracking-wider text-white uppercase">
                                {plan.name}
                              </h3>
                              <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">
                                {plan.period} SUBSCRIPTION
                              </p>

                              {/* Price Tag */}
                              <div className="mt-4 flex items-baseline gap-1">
                                <span className="text-2xl font-serif font-black text-gold-base">{plan.price}</span>
                                <span className="text-[9px] text-white/40 font-mono">/{plan.period}</span>
                              </div>
                            </div>

                            {/* Benefits highlight */}
                            <div className="mt-4 border-t border-white/5 pt-4">
                              <ul className="flex flex-col gap-1">
                                {plan.benefits.slice(0, 2).map((benefit, bIdx) => (
                                  <li key={`card-checked-${plan.id || idx}-${bIdx}`} className="text-[10px] text-white/70 flex items-center gap-2">
                                    <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                                    <span className="truncate">{benefit}</span>
                                  </li>
                                ))}
                                {plan.closedBenefits && plan.closedBenefits.slice(0, 1).map((cb, cbIdx) => (
                                  <li key={`card-closed-${plan.id || idx}-${cbIdx}`} className="text-[10px] text-white/35 flex items-center gap-2 line-through decoration-white/10">
                                    <X className="w-3 h-3 text-red-500/50 shrink-0" />
                                    <span className="truncate">{cb}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Secure badging features */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                      <div className="luxury-glass p-4 rounded-2xl border-white/5 flex gap-3 items-start">
                        <Shield className="w-5 h-5 text-gold-base shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">AES ENCRYPTED</h4>
                          <p className="text-[9px] text-white/40 mt-0.5 leading-relaxed">Secure SSL authentication protocols.</p>
                        </div>
                      </div>
                      <div className="luxury-glass p-4 rounded-2xl border-white/5 flex gap-3 items-start">
                        <Flame className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">PRIORITY ROUTING</h4>
                          <p className="text-[9px] text-white/40 mt-0.5 leading-relaxed">Dedicated server relay buffers.</p>
                        </div>
                      </div>
                      <div className="luxury-glass p-4 rounded-2xl border-white/5 flex gap-3 items-start">
                        <Crown className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">LIFETIME OPTIONS</h4>
                          <p className="text-[9px] text-white/40 mt-0.5 leading-relaxed">Infinite licenses for founders.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Checkout Portal & Details (Spans 5 cols on large displays) */}
                  <div className="lg:col-span-5 flex flex-col gap-6">
                    <motion.div
                      key="step-1-summary"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="luxury-glass p-8 rounded-[36px] border-white/5 bg-white/[0.01] flex flex-col gap-6"
                    >
                      <div>
                        <h3 className="text-xs font-tech text-white/40 uppercase tracking-widest">ORDER BREAKDOWN</h3>
                        <h2 className="text-lg font-serif font-bold text-white mt-1 uppercase">
                          VIP SYSTEM LICENSE DETAILS
                        </h2>
                      </div>

                      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-4">
                        <div className="flex justify-between items-center pb-3 border-b border-white/5">
                          <div>
                            <span className="text-xs font-bold text-white uppercase block">{selectedPlanDetails?.name}</span>
                            <span className="text-[9px] text-white/40 uppercase tracking-widest">{selectedPlanDetails?.period} ACCESS</span>
                          </div>
                          <span className="text-lg font-serif font-bold text-gold-base">{selectedPlanDetails?.price}</span>
                        </div>

                        {/* Full List of Benefits */}
                        <div className="flex flex-col gap-2">
                          <span className="text-[9px] font-tech text-white/40 uppercase tracking-wider">INCLUDED PRIVILEGES:</span>
                          <ul className="flex flex-col gap-2">
                            {selectedPlanDetails?.benefits?.map((benefit, idx) => (
                              <li key={`checked-${idx}`} className="text-[10px] text-white/80 flex items-start gap-2.5">
                                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                <span className="leading-tight">{benefit}</span>
                              </li>
                            ))}
                            {selectedPlanDetails?.closedBenefits?.map((cb, idx) => (
                              <li key={`closed-${idx}`} className="text-[10px] text-white/35 flex items-start gap-2.5">
                                <X className="w-3.5 h-3.5 text-red-500/50 shrink-0 mt-0.5" />
                                <span className="leading-tight line-through decoration-white/10">{cb}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Proceed to activation button */}
                      <div className="flex flex-col gap-3">
                        <motion.button
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setShowPaymentForm(true)}
                          className="w-full gold-gradient-bg text-black font-semibold text-xs py-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_4px_25px_rgba(212,175,55,0.2)] hover:brightness-110 cursor-pointer transition-all"
                        >
                          <CreditCard className="w-4 h-4 text-black stroke-[2.2px]" />
                          ACTIVATE {selectedPlanDetails?.name}
                        </motion.button>
                        
                        <p className="text-[9px] text-center text-white/30 tracking-wider">
                          By clicking activate, you can customize your payment credentials and secure your membership.
                        </p>
                      </div>
                    </motion.div>
                  </div>
                </div>
              ) : (
                /* Two Table Cards Layout (Credit Card & UPI QR Auto Payment side-by-side) */
                <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
                  {/* Back button and title */}
                  <div className="text-left">
                    <button
                      onClick={() => {
                        setShowPaymentForm(false);
                        setPaymentMessage('');
                      }}
                      className="text-[9px] font-tech font-bold text-gold-base hover:text-white tracking-widest uppercase mb-2 flex items-center gap-1 cursor-pointer transition-all"
                    >
                      ← BACK TO PLAN DECK
                    </button>
                    <h1 className="text-2xl md:text-3xl font-serif font-black text-white uppercase tracking-wider">
                      SELECT PAYMENT ROUTE
                    </h1>
                    <p className="text-xs text-white/40 uppercase tracking-widest mt-1">
                      UPGRADE TIER: {selectedPlanDetails?.name} • PRICE: {selectedPlanDetails?.price}
                    </p>
                  </div>

                  {paymentMessage && (
                    <div className={`p-4 rounded-xl border text-xs font-mono tracking-wider text-center ${
                      paymentMessage.includes("SUCCESSFUL") || paymentMessage.includes("UNLOCKED")
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                    }`}>
                      {paymentMessage}
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                    {/* Card Table 1: STRIPE / PAYPAL SIMULATED GATEWAYS */}
                    <motion.div
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="luxury-glass p-6 md:p-8 rounded-[32px] border border-white/5 bg-black/40 flex flex-col gap-6 justify-between text-left"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-gold-base" />
                            <h3 className="text-sm font-serif font-black text-white uppercase tracking-wider">
                              SECURE CHECKOUT FLOW
                            </h3>
                          </div>
                          <span className="text-[8px] font-mono font-black text-gold-base bg-gold-base/10 border border-gold-base/20 px-2 py-0.5 rounded-md uppercase tracking-wider animate-pulse">
                            SIMULATED GATEWAY
                          </span>
                        </div>
                        <p className="text-[10px] text-white/50 leading-relaxed mb-4">
                          Select your preferred secure processing pipeline. Transactions are simulated safely to unlock instant premium privileges.
                        </p>

                        {/* Gateway Selector Tabs */}
                        <div className="flex border border-white/5 rounded-xl overflow-hidden mb-6 bg-black/60 p-1">
                          <button
                            type="button"
                            onClick={() => setActiveGateway('stripe')}
                            className={`flex-1 py-2 rounded-lg text-[10px] font-mono font-bold tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                              activeGateway === 'stripe'
                                ? 'bg-white/10 text-gold-base shadow-md border border-white/5'
                                : 'text-white/40 hover:text-white/70'
                            }`}
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Stripe Elements
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveGateway('paypal')}
                            className={`flex-1 py-2 rounded-lg text-[10px] font-mono font-bold tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                              activeGateway === 'paypal'
                                ? 'bg-blue-500/10 text-blue-400 shadow-md border border-blue-500/25'
                                : 'text-white/40 hover:text-white/70'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            PayPal Express
                          </button>
                        </div>

                        {activeGateway === 'paypal' ? (
                          <div className="flex flex-col gap-6 text-center py-4">
                            <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6 flex flex-col items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
                              </div>
                              <h4 className="text-xs font-bold text-white uppercase tracking-wider">PayPal Express Sandbox</h4>
                              <p className="text-[10px] text-white/50 leading-relaxed max-w-xs">
                                Pay securely from your PayPal wallet balance or linked bank cards instantly using our mock authorization pipeline.
                              </p>
                            </div>

                            <div className="flex flex-col gap-3">
                              <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={handlePayPalCheckoutSubmit}
                                className="w-full bg-[#FFC439] hover:bg-[#F2B522] text-black font-extrabold text-xs py-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_25px_rgba(255,196,57,0.2)] cursor-pointer transition-all uppercase tracking-wider"
                              >
                                <span className="font-serif italic font-extrabold lowercase text-blue-900 text-sm">pay<span className="text-[#0079C1]">pal</span></span> Secure Checkout
                              </motion.button>
                              
                              <p className="text-[9px] text-white/30 leading-normal">
                                Instant automated delivery of your cinematic pass keys after successful sandbox wallet authentication.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* 3D Gold Card mockup */}
                            <div className="w-full aspect-[1.586/1] bg-gradient-to-br from-[#1c1813] via-[#0b0a0a] to-[#251e15] rounded-xl p-5 border border-gold-base/20 shadow-2xl relative flex flex-col justify-between overflow-hidden mb-6">
                              <div className="absolute top-0 right-0 w-24 h-24 gold-radial-glow opacity-15 pointer-events-none" />
                              <div className="flex items-center justify-between">
                                <div className="w-8 h-6 rounded bg-gradient-to-r from-gold-light/40 to-gold-dark/40 border border-gold-base/30" />
                                <Crown className="w-5 h-5 text-gold-base" />
                              </div>
                              <div className="text-xs md:text-sm font-mono tracking-[0.2em] text-white/90 font-bold">
                                {cardNumber || '••••  ••••  ••••  ••••'}
                              </div>
                              <div className="flex justify-between items-end">
                                <div className="flex flex-col">
                                  <span className="text-[6px] font-tech text-white/30 uppercase tracking-wider">CARDHOLDER</span>
                                  <span className="text-[9px] font-tech text-gold-base uppercase tracking-widest max-w-[120px] truncate">
                                    {cardName || 'YOUR FULL NAME'}
                                  </span>
                                </div>
                                <div className="flex gap-3">
                                  <div className="flex flex-col items-end">
                                    <span className="text-[6px] font-tech text-white/30 uppercase tracking-wider">EXPIRY</span>
                                    <span className="text-[9px] font-tech text-white">{cardExpiry || 'MM/YY'}</span>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span className="text-[6px] font-tech text-white/30 uppercase tracking-wider">CVV</span>
                                    <span className="text-[9px] font-tech text-white">•••</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Checkout Input Form */}
                            <form
                              onSubmit={handleStripeCheckoutSubmit}
                              className="flex flex-col gap-3.5"
                            >
                              <div className="flex flex-col gap-1 text-left">
                                <label className="text-[8px] font-tech text-white/40 uppercase tracking-wider">CARDHOLDER NAME</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. ALEXANDER MERCER"
                                  value={cardName}
                                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                                  className="bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gold-base placeholder-white/20 uppercase tracking-wider font-mono"
                                />
                              </div>

                              <div className="flex flex-col gap-1 text-left">
                                <label className="text-[8px] font-tech text-white/40 uppercase tracking-wider">CREDIT CARD NUMBER</label>
                                <input
                                  type="text"
                                  required
                                  maxLength={19}
                                  placeholder="e.g. 4000 1234 5678 9010"
                                  value={cardNumber}
                                  onChange={(e) => {
                                    let val = e.target.value.replace(/\D/g, '');
                                    let matches = val.match(/\d{4,16}/g);
                                    let match = (matches && matches[0]) || '';
                                    let parts = [];
                                    for (let i = 0, len = match.length; i < len; i += 4) {
                                      parts.push(match.substring(i, i + 4));
                                    }
                                    if (parts.length > 0) {
                                      setCardNumber(parts.join(' '));
                                    } else {
                                      setCardNumber(val);
                                    }
                                  }}
                                  className="bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-gold-base placeholder-white/20 tracking-widest"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-3 text-left">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[8px] font-tech text-white/40 uppercase tracking-wider">EXPIRY DATE</label>
                                  <input
                                    type="text"
                                    required
                                    maxLength={5}
                                    placeholder="MM/YY"
                                    value={cardExpiry}
                                    onChange={(e) => {
                                      let val = e.target.value.replace(/\D/g, '');
                                      if (val.length >= 2) {
                                        setCardExpiry(val.substring(0, 2) + '/' + val.substring(2, 4));
                                      } else {
                                        setCardExpiry(val);
                                      }
                                    }}
                                    className="bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gold-base placeholder-white/20 text-center font-mono"
                                  />
                                </div>

                                <div className="flex flex-col gap-1">
                                  <label className="text-[8px] font-tech text-white/40 uppercase tracking-wider">CVV CODE</label>
                                  <input
                                    type="password"
                                    required
                                    maxLength={3}
                                    placeholder="•••"
                                    value={cardCvv}
                                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                                    className="bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gold-base placeholder-white/20 text-center font-mono"
                                  />
                                </div>
                              </div>

                              <motion.button
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                className="w-full gold-gradient-bg text-black font-semibold text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(212,175,55,0.2)] cursor-pointer hover:brightness-110 transition-all disabled:opacity-50 mt-2"
                              >
                                <Shield className="w-4 h-4 text-black" />
                                PAY WITH STRIPE ({selectedPlanDetails?.price})
                              </motion.button>
                            </form>
                          </>
                        )}
                      </div>
                    </motion.div>

                    {/* Card Table 2: UPI & QR CODE METHOD (Instant Automatic Gateway) */}
                    <motion.div
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="luxury-glass p-6 md:p-8 rounded-[32px] border border-emerald-500/10 bg-black/40 flex flex-col gap-6 justify-between text-left"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
                            <h3 className="text-sm font-serif font-black text-white uppercase tracking-wider">
                              INSTANT UPI & QR GATEWAY
                            </h3>
                          </div>
                          <span className="text-[8px] font-mono font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider animate-pulse">
                            {adminPaymentSettings?.paymentType === 'auto' ? 'AUTOMATED INTEGRATION' : 'REQUEST ROUTE'}
                          </span>
                        </div>
                        <p className="text-[10px] text-white/50 leading-relaxed mb-4">
                          {adminPaymentSettings?.paymentType === 'auto' 
                            ? 'Instant verification: opens any active UPI application on your device to finalize the subscription and unlock premium instantly.'
                            : 'Scan the secure QR Code or transfer to the listed merchant UPI ID. Once transferred, submit an access ticket.'}
                        </p>

                        {/* QR Code Container */}
                        <div className="flex flex-col items-center justify-center gap-4 bg-black/60 p-6 rounded-2xl border border-white/5 relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-transparent pointer-events-none" />
                          
                          <div className="w-40 h-40 bg-white p-2.5 rounded-xl flex items-center justify-center border border-white/10 shadow-2xl relative group">
                            {/* Visual QR Scanning Lines */}
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-500 animate-[bounce_3s_infinite]" />
                            <img
                              src={adminPaymentSettings?.qrCodeUrl || 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=eliteplex@ybl%26pn=Elite%20Plex%26cu=INR'}
                              alt="Secure Checkout QR Code"
                              className="w-full h-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                          </div>

                          <div className="text-center w-full">
                            <span className="text-[8px] font-tech text-white/40 uppercase tracking-widest block mb-1">UPI ADDRESS / MERCHANT ID</span>
                            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-3.5 py-1.5 rounded-lg inline-block select-all tracking-wider break-all max-w-full">
                              {adminPaymentSettings?.upiId || 'eliteplex@ybl'}
                            </span>
                          </div>
                        </div>

                        {/* Payment Actions and Feedback */}
                        <div className="flex flex-col gap-3 mt-4">
                          <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={handleInstantUPIPay}
                            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-black font-extrabold text-xs py-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_25px_rgba(16,185,129,0.25)] cursor-pointer hover:brightness-110 transition-all"
                          >
                            <Sparkles className="w-4 h-4 text-black stroke-[2.2px]" />
                            LAUNCH UPI APP & PAY ({selectedPlanDetails?.price})
                          </motion.button>

                          <p className="text-[8.5px] text-center text-white/30 leading-normal">
                            Supports PhonePe, Google Pay, Paytm, BHIM, and more. 100% secure peer-to-peer ledger network.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              )}
            </div>
          )}
        </AnimatePresence>

        {/* Dynamic UPI Verification / Simulation Overlay Modal */}
        <AnimatePresence>
          {showUPIModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md luxury-glass border border-white/10 rounded-[32px] p-8 shadow-3xl text-center relative bg-black/95 text-white"
              >
                {/* Spinning / Pulsing Verification Radar */}
                <div className="relative w-28 h-28 mx-auto flex items-center justify-center mb-6">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 rounded-full border-2 border-dashed border-emerald-500/40"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-3 rounded-full bg-emerald-500/10 border border-emerald-500/30"
                  />
                  <div className="absolute inset-6 bg-gradient-to-tr from-emerald-600 to-emerald-400 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.5)]">
                    <Sparkles className="w-10 h-10 text-black animate-pulse" />
                  </div>
                </div>

                <h3 className="text-xl font-serif font-black tracking-wider text-emerald-400 uppercase mb-2">
                  AWAITING PAYMENT CAPTURE
                </h3>
                <p className="text-xs text-white/60 leading-relaxed font-light mb-6">
                  Your UPI app has been launched. Please complete the transfer of <strong className="text-white font-bold">{selectedPlanDetails?.price}</strong> in your payment app. Once paid, click the verification button below.
                </p>

                {/* Countdown Progress Circle / Bar */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 mb-6 text-left flex items-center justify-between">
                  <div>
                    <span className="text-[8px] font-tech text-white/40 uppercase tracking-widest block">EXPECTED SETTLE TIME</span>
                    <span className="text-base font-mono font-black text-white">
                      {Math.floor(upiTimer / 60)}:{(upiTimer % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-tech text-emerald-400/40 uppercase tracking-widest block">LEDGER PROTOCOL</span>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase animate-pulse">
                      LISTENING LIVE...
                    </span>
                  </div>
                </div>

                {/* Status or Toast */}
                {loading && (
                  <div className="flex items-center justify-center gap-2 text-xs font-mono text-white/60 mb-6">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    AUTHENTICATING TRANSACTION BLOCK...
                  </div>
                )}

                {/* User Verification Actions */}
                <div className="flex flex-col gap-3">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    disabled={loading}
                    onClick={handleUPISuccess}
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-400 hover:brightness-110 text-black font-extrabold text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 text-black stroke-[3px]" />
                    I HAVE SUCCESSFULLY PAID
                  </motion.button>
                  
                  <button
                    disabled={loading}
                    onClick={handleUPICancel}
                    className="w-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-tech font-extrabold text-[10px] tracking-widest uppercase py-3 rounded-xl transition-all cursor-pointer border border-white/5 disabled:opacity-50"
                  >
                    CANCEL TRANSACTION
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Simulated Secure Checkout Gateway Modal */}
        <AnimatePresence>
          {showGatewayModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md luxury-glass border border-white/10 rounded-[32px] p-8 shadow-3xl text-center relative bg-black/95 text-white flex flex-col gap-6"
              >
                {/* Close Button if not capturing */}
                {gatewayPhase !== 'capturing' && gatewayPhase !== 'success' && (
                  <button
                    onClick={() => setShowGatewayModal(false)}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white/50 hover:text-white transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                {/* Header branding depending on gateway */}
                <div className="flex items-center justify-center gap-2 border-b border-white/5 pb-4">
                  {activeGateway === 'stripe' ? (
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="w-5 h-5 text-gold-base" />
                      <span className="text-xs font-mono font-black uppercase tracking-widest text-gold-base">Stripe Secure Endpoint</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="font-serif italic font-extrabold lowercase text-[#0079C1] text-lg">pay<span className="text-[#00457C]">pal</span></span>
                      <span className="text-xs font-mono font-bold uppercase tracking-widest text-blue-400">Sandbox Portal</span>
                    </div>
                  )}
                </div>

                {/* Phase 1: Connecting */}
                {gatewayPhase === 'connecting' && (
                  <div className="flex flex-col items-center gap-4 py-6">
                    <div className="w-16 h-16 rounded-full border-2 border-t-gold-base border-white/5 animate-spin" />
                    <h3 className="text-sm font-mono uppercase tracking-widest text-white/80">Connecting Gateway</h3>
                    <p className="text-[11px] text-white/40 max-w-xs leading-relaxed">
                      Establishing an encrypted cryptographic handshake link to {activeGateway === 'stripe' ? 'Stripe Elements Secure Server' : 'PayPal Wallet Relay System'}...
                    </p>
                  </div>
                )}

                {/* Phase 2: Verifying */}
                {gatewayPhase === 'verifying' && (
                  <>
                    {activeGateway === 'stripe' ? (
                      <div className="flex flex-col items-center gap-4 py-6">
                        <div className="w-16 h-16 rounded-full border-2 border-t-emerald-500 border-white/5 animate-spin" />
                        <h3 className="text-sm font-mono uppercase tracking-widest text-emerald-400">Verifying Credentials</h3>
                        <p className="text-[11px] text-white/40 max-w-xs leading-relaxed">
                          Tokenizing credit card parameters with AES-256 secure end-to-end endpoints...
                        </p>
                      </div>
                    ) : (
                      // PayPal login form
                      <form onSubmit={handlePayPalLoginSubmit} className="flex flex-col gap-4 text-left">
                        <div className="text-center mb-2">
                          <h3 className="text-sm font-serif font-black uppercase tracking-wider text-white">Log in to PayPal Sandbox</h3>
                          <p className="text-[10px] text-white/40 uppercase mt-0.5 font-mono">Use any mock details to log in</p>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[8px] font-tech text-white/40 uppercase tracking-wider">EMAIL ADDRESS</label>
                          <input
                            type="email"
                            required
                            placeholder="sandbox-buyer@paypal.com"
                            value={paypalEmail}
                            onChange={(e) => setPaypalEmail(e.target.value)}
                            className="bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-400"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[8px] font-tech text-white/40 uppercase tracking-wider">PASSWORD</label>
                          <input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={paypalPassword}
                            onChange={(e) => setPaypalPassword(e.target.value)}
                            className="bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-400"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-[#0079C1] hover:bg-[#00457C] text-white font-extrabold text-[10px] tracking-widest uppercase py-3.5 rounded-xl transition-all cursor-pointer mt-2"
                        >
                          LOG IN TO SANDBOX WALLET
                        </button>
                      </form>
                    )}
                  </>
                )}

                {/* Phase 3: 3DS Verification or Review & Complete */}
                {gatewayPhase === '3ds' && (
                  <>
                    {activeGateway === 'stripe' ? (
                      <div className="flex flex-col gap-5 text-left">
                        <div className="text-center mb-2">
                          <h3 className="text-sm font-serif font-black uppercase tracking-wider text-white">3D Secure 2.0 Authorization</h3>
                          <p className="text-[10px] text-white/40 uppercase mt-0.5 font-mono">Simulated OTP verification</p>
                        </div>

                        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[10px] leading-relaxed text-white/70">
                          A simulated 3D Secure verification code has been generated. Please enter the master authorization key <strong className="text-gold-light font-bold">1234</strong> to verify and authorize this payment.
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[8px] font-tech text-white/40 uppercase tracking-wider">ONE-TIME AUTHENTICATION CODE</label>
                          <input
                            type="text"
                            required
                            placeholder="Enter 1234"
                            value={stripe3dsCode}
                            onChange={(e) => setStripe3dsCode(e.target.value)}
                            className="bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white text-center tracking-widest font-mono focus:outline-none focus:border-gold-base"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleStripe3dsVerify}
                          className="w-full gold-gradient-bg text-black font-extrabold text-[10px] tracking-widest uppercase py-3.5 rounded-xl transition-all cursor-pointer mt-2"
                        >
                          CONFIRM SECURE PAYMENT
                        </button>
                      </div>
                    ) : (
                      // PayPal Review and Pay
                      <div className="flex flex-col gap-5 text-left">
                        <div className="text-center mb-2">
                          <h3 className="text-sm font-serif font-black uppercase tracking-wider text-white">Review Your Purchase</h3>
                          <p className="text-[10px] text-white/40 uppercase mt-0.5 font-mono">PayPal Wallet Sandbox balance</p>
                        </div>

                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-3">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-white/40 uppercase tracking-wider">BILLING TO</span>
                            <span className="text-white font-bold">{currentUser?.name || 'Alexander Mercer'}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-white/40 uppercase tracking-wider">FUNDING SOURCE</span>
                            <span className="text-blue-400 font-mono font-bold">PayPal Balance ($450.00)</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] border-t border-white/5 pt-2 mt-1">
                            <span className="text-white/40 uppercase tracking-wider">ORDER TOTAL</span>
                            <span className="text-white font-black">{selectedPlanDetails?.price}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handlePayPalCompletePay}
                          className="w-full bg-[#FFC439] hover:bg-[#F2B522] text-black font-extrabold text-[10px] tracking-widest uppercase py-3.5 rounded-xl transition-all cursor-pointer mt-2"
                        >
                          AGREE AND PAY {selectedPlanDetails?.price}
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Phase 4: Capturing */}
                {gatewayPhase === 'capturing' && (
                  <div className="flex flex-col items-center gap-4 py-6">
                    <div className="w-16 h-16 rounded-full border-2 border-t-gold-base border-white/5 animate-spin" />
                    <h3 className="text-sm font-mono uppercase tracking-widest text-gold-base">Capturing Funds</h3>
                    <p className="text-[11px] text-white/40 max-w-xs leading-relaxed">
                      Finalizing checkout token sequence... Upgrading your profile credentials to VIP status in real-time...
                    </p>
                  </div>
                )}

                {/* Phase 5: Success */}
                {gatewayPhase === 'success' && (
                  <div className="flex flex-col items-center gap-4 py-6">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                      <Check className="w-8 h-8 text-emerald-400 stroke-[3px]" />
                    </div>
                    <h3 className="text-sm font-mono uppercase tracking-widest text-emerald-400">Transaction Authorized</h3>
                    <p className="text-[11px] text-white/40 max-w-xs leading-relaxed">
                      Vault keys decrypted and synced successfully. Access unlocked!
                    </p>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
      
      {/* Immersive Footer Branding */}
      <footer className="relative z-10 w-full text-center py-6 border-t border-white/5 mt-auto">
        <span className="text-[8px] font-tech text-white/20 tracking-[0.3em] uppercase block">
          EP PLEX VIP SERVICES © 2026 • SECURITY ENCRYPTED BY FIRESTORE
        </span>
      </footer>
    </div>
  );
}
