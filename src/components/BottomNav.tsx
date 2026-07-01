import { motion } from 'motion/react';
import { Home, Film, Tv, Radio, User } from 'lucide-react';
import { UserProfile } from '../types';
import { playInterfaceTick } from '../lib/soundEffects';
import { translateText } from '../lib/translator';

export type TabType = 'home' | 'movies' | 'series' | 'livetv' | 'profile' | 'admin' | 'subscribe';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  currentUser?: UserProfile | null;
  language?: string;
  highZIndex?: boolean;
}

export default function BottomNav({ activeTab, onChangeTab, currentUser, language = 'English', highZIndex }: BottomNavProps) {
  const profileLabel = currentUser && currentUser.name 
    ? (currentUser.name.split(' ')[0].length > 8 
        ? currentUser.name.split(' ')[0].substring(0, 7) + '..' 
        : currentUser.name.split(' ')[0]
      ).toUpperCase()
    : 'PROFILE';

  const navItems = [
    { id: 'home' as TabType, label: 'HOME', icon: Home },
    { id: 'movies' as TabType, label: 'MOVIES', icon: Film },
    { id: 'series' as TabType, label: 'SERIES', icon: Tv },
    { id: 'livetv' as TabType, label: 'LIVE TV', icon: Radio },
    { 
      id: 'profile' as TabType, 
      label: profileLabel, 
      icon: User 
    }
  ];

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-lg ${highZIndex ? 'z-[60]' : 'z-30'}`}>
      {/* Floating Curved Container */}
      <div className="luxury-glass rounded-[24px] px-3 py-3 shadow-[0_15px_35px_rgba(0,0,0,0.65)] border border-white/10 flex items-center justify-around relative">
        {/* Glow effect under active tab */}
        {(() => {
          const activeItem = navItems.find((x) => x.id === activeTab);
          if (!activeItem) return null;
          return (
            <motion.div
              key={`nav-glow-${activeItem.id}`}
              layoutId="nav-glow"
              className="absolute w-12 h-6 bg-gold-base/15 rounded-full blur-md pointer-events-none"
              style={{
                left: `${
                  (navItems.findIndex((x) => x.id === activeTab) / navItems.length) * 100 + (50 / navItems.length) - 5
                }%`,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          );
        })()}

        {/* Navigation Items */}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isProfileTab = item.id === 'profile';

          return (
            <button
              key={item.id}
              onClick={() => {
                playInterfaceTick();
                onChangeTab(item.id);
              }}
              className="flex flex-col items-center gap-1 cursor-pointer py-1 px-2.5 relative group"
            >
              {/* Highlight bar above active item */}
              {isActive && (
                <motion.div
                  layoutId="active-bar"
                  className="absolute -top-3 w-4 h-[3px] gold-gradient-bg rounded-full shadow-[0_0_8px_rgba(212,175,55,1)]"
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                />
              )}

              {/* Icon with smooth bounce */}
              <motion.div
                animate={isActive ? { scale: 1.15, y: -2 } : { scale: 1, y: 0 }}
                className={`transition-all duration-200 ${
                  isActive ? 'text-gold-base' : 'text-white/40 group-hover:text-white/80'
                }`}
              >
                <Icon className="w-5 h-5 stroke-[1.8]" />
              </motion.div>

              {/* Mini Label */}
              <span
                className={`text-[8px] font-tech font-bold tracking-[0.1em] transition-colors duration-200 ${
                  isActive ? 'text-gold-base' : 'text-white/30 group-hover:text-white/60'
                }`}
              >
                {translateText(item.label, language)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
