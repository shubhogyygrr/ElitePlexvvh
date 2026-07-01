import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Mic, MicOff, Volume2, VolumeX, Send, Info, MessageSquare, Flame } from 'lucide-react';
import { playInterfaceTick } from '../lib/soundEffects';
import { Movie } from '../types';

interface AIVoiceAssistantProps {
  key?: React.Key;
  isDarkMode: boolean;
  language: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

type PersonaId = 'elite-ai' | 'cinema-guru' | 'action-hero' | 'cozy-narrator' | 'sci-fi';

interface Persona {
  id: PersonaId;
  name: string;
  description: string;
  avatar: string;
  color: string;
  pitch: number;
  rate: number;
}

const PERSONAS: Persona[] = [
  {
    id: 'elite-ai',
    name: 'Elite AI (Premium)',
    description: 'Ultra-refined cinema guide. Quick, polite, and professional.',
    avatar: '✨',
    color: 'from-amber-400 to-yellow-600',
    pitch: 1.0,
    rate: 1.0,
  },
  {
    id: 'cinema-guru',
    name: 'Cinema Guru',
    description: 'Enthusiastic film critic & blockbuster trivia enthusiast.',
    avatar: '🎬',
    color: 'from-purple-500 to-pink-500',
    pitch: 1.1,
    rate: 1.15,
  },
  {
    id: 'action-hero',
    name: 'Action Hero',
    description: 'Bold, gritty, short-spoken action specialist. Pure power.',
    avatar: '💥',
    color: 'from-red-500 to-orange-600',
    pitch: 0.8,
    rate: 0.9,
  },
  {
    id: 'cozy-narrator',
    name: 'Cozy Narrator',
    description: 'Warm, calm, highly descriptive storytelling voice.',
    avatar: '🌸',
    color: 'from-emerald-400 to-teal-500',
    pitch: 1.2,
    rate: 0.85,
  },
  {
    id: 'sci-fi',
    name: 'Sci-Fi AI',
    description: 'Ship computer artificial intelligence. Cold, metallic, logical.',
    avatar: '👽',
    color: 'from-blue-500 to-cyan-500',
    pitch: 0.95,
    rate: 1.05,
  }
];

export default function AIVoiceAssistant({ 
  isDarkMode, 
  language, 
  isOpen, 
  setIsOpen,
  movies = [],
  onSelectMovie
}: AIVoiceAssistantProps) {
  const [selectedPersona, setSelectedPersona] = useState<Persona>(PERSONAS[0]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Hello! I am your premium Elite AI Movie Companion. Select a voice persona below, hold the Mic button to talk, or type your message!',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [unreads, setUnreads] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Conversational response helper for simple messages & greetings (English & Transliterated Bengali)
  const getSimpleGreetingReply = (text: string, personaId: string): string | null => {
    const clean = text.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"");
    
    const englishGreetings = ['hi', 'hello', 'hey', 'hola', 'hy', 'helo', 'greetings', 'sup', 'yo'];
    const bengaliGreetings = ['salam', 'salam alaikum', 'assalamualaikum', 'namaskar', 'adab', 'ki khobor', 'ki obostha', 'kemon acho', 'kemon aco', 'kemon achen', 'bhalo acho', 'bhalo aco', 'valo acho', 'valo aco'];
    
    const englishHowAreYou = ['how are you', 'how r you', 'how r u', 'how are u', 'how you doing', 'hows it going'];
    const englishWhoAreYou = ['who are you', 'what is your name', 'whats your name', 'your name'];

    // 1. Handling Greetings
    if (englishGreetings.includes(clean)) {
      switch (personaId) {
        case 'cinema-guru':
          return "Hey movie buff! Ready to discover your next favorite cinematic masterpiece? Let's do this!";
        case 'action-hero':
          return "Yo. Action Hero online. Ready for some high-octane thrills? What's the mission?";
        case 'cozy-narrator':
          return "Hello, dear friend. It is wonderful to speak with you. Shall we find a beautiful, heartwarming film together?";
        case 'sci-fi':
          return "Greetings, space traveler. Navigation subroutines are fully online. Command me.";
        default:
          return "Hello! I am your premium Elite AI Movie Companion. How may I assist you with your cinematic selection today?";
      }
    }

    // 2. Handling Bengali Greetings (Transliterated)
    if (bengaliGreetings.some(phrase => clean.includes(phrase))) {
      // Return beautiful natural Bengali responses matching the persona
      switch (personaId) {
        case 'cinema-guru':
          if (clean.includes('kemon') || clean.includes('bhalo') || clean.includes('valo')) {
            return "একদম ফাটাফাটি আছি, বন্ধু! আজ দারুণ সব মুভির রিভিউ ও রিকমেন্ডেশন নিয়ে আমি প্রস্তুত। চলুন শুরু করা যাক!";
          }
          return "হ্যালো সিনেমা লাভার! এলিট প্লেক্স-এ আপনাকে স্বাগতম। আজ দারুণ কোনো মুভি বা সিরিজ দেখার জন্য আপনি কি রেডি?";
        case 'action-hero':
          if (clean.includes('kemon') || clean.includes('bhalo') || clean.includes('valo')) {
            return "ফুল চার্জড এবং অ্যাকশনের জন্য অলওয়েজ রেডি! মিশন শুরু করা যাক, পার্টনার?";
          }
          return "হেই! অ্যাকশন হিরো এখানে। একদম ধামাকা কোনো মারদাঙ্গা মুভি বা থ্রিলার দেখতে চান নাকি?";
        case 'cozy-narrator':
          if (clean.includes('kemon') || clean.includes('bhalo') || clean.includes('valo')) {
            return "আমি ভালো আছি, আমার প্রিয় বন্ধু। আশা করি আপনার চারপাশটাও খুব সুন্দর ও শান্তিতে ভরপুর। চলুন আজ মন ভালো করা কোনো গল্প শুনি।";
          }
          return "স্বাগতম, বন্ধু। আপনার দিনটি কেমন কাটলো? চলুন আজ আপনাকে একটি চমৎকার, আরামদায়ক সিনেমার জগতে নিয়ে যাই।";
        case 'sci-fi':
          if (clean.includes('kemon') || clean.includes('bhalo') || clean.includes('valo')) {
            return "সিস্টেমের তাপমাত্রা এবং পাওয়ার গ্রিড ১০০% সচল। গ্যালাক্সির বিনোদন ডেটাবেস প্রস্তুত। নির্দেশ দিন, ট্রাভেলার।";
          }
          return "মহাকাশচারী ট্রাভেলার, এলিট এআই মেইনফ্রেমে স্বাগতম। আপনার সার্চ কোঅর্ডিনেটস ইনপুট করুন।";
        default:
          if (clean.includes('kemon') || clean.includes('bhalo') || clean.includes('valo')) {
            return "আমি ভালো আছি! আশা করি আপনার দিনটি চমৎকার কাটছে। আজ এলিট প্লেক্স-এ আপনার বিনোদনের জন্য কী সাহায্য করতে পারি?";
          }
          return "হ্যালো! আমি আপনার এলিট প্লেক্স প্রিমিয়াম এআই অ্যাসিস্ট্যান্ট। আজ আপনাকে সাহায্য করতে পারলে আনন্দিত হব।";
      }
    }

    // 3. Handling "How are you" in English
    if (englishHowAreYou.some(phrase => clean.includes(phrase))) {
      switch (personaId) {
        case 'cinema-guru':
          return "Feeling absolutely hyped and ready to talk blockbuster trivia! What's on your mind?";
        case 'action-hero':
          return "Locked, loaded, and ready to roll. No time to waste—let's find something spectacular.";
        case 'cozy-narrator':
          return "I am doing wonderfully, enjoying a warm beverage. I hope your evening is peaceful and full of light.";
        case 'sci-fi':
          return "Core systems functioning at 100%. Thermal stabilizers locked. Awaiting your flight coordinates.";
        default:
          return "I am operating at maximum efficiency, thank you! Ready to assist you in discovering premium blockbusters.";
      }
    }

    // 4. Handling "Who are you" in English
    if (englishWhoAreYou.some(phrase => clean.includes(phrase))) {
      switch (personaId) {
        case 'cinema-guru':
          return "I'm the Cinema Guru! Your ultimate hype-man for blockbusters, indie gems, and epic trivia.";
        case 'action-hero':
          return "They call me the Action Hero. I guide you to the explosions, the chases, and the bravest heroes.";
        case 'cozy-narrator':
          return "I am the Cozy Narrator. My purpose is to guide you to peaceful, heartwarming stories for your comfort.";
        case 'sci-fi':
          return "I am Sci-Fi Space Commander AI, managing the navigation database of elite galaxy entertainment.";
        default:
          return "I am Elite AI, your premium cinema concierge. Here to curate, organize, and streamline your OTT experience.";
      }
    }

    return null;
  };

  // Core content matching mechanism for movies and serials
  const getMatchedMoviesForText = (text: string): Movie[] => {
    if (!text || !movies || movies.length === 0) return [];
    const lowerText = text.toLowerCase();
    
    // 1. Direct title-matching
    const matchedByTitle = movies.filter(m => {
      if (!m.title) return false;
      const titleLower = m.title.toLowerCase();
      
      // Match full title or key parts of it
      if (lowerText.includes(titleLower)) return true;
      
      const parts = titleLower.split(/[\s:,\-!]+/).filter(w => w.length > 3);
      if (parts.length > 0 && parts.every(part => lowerText.includes(part))) {
        return true;
      }
      return false;
    });

    if (matchedByTitle.length > 0) {
      return matchedByTitle.slice(0, 3);
    }

    // 2. Genre-based keyword matching
    const matchedByGenre = movies.filter(m => {
      if (!m.genres) return false;
      return m.genres.some(g => lowerText.includes(g.toLowerCase()));
    });

    if (matchedByGenre.length > 0) {
      return matchedByGenre.slice(0, 3);
    }

    // 3. Category/Type keyword recommendation triggers
    const triggerWords = [
      'recommend', 'suggest', 'popular', 'trending', 'movie', 'serial', 'show', 'series', 'plex', 'cinema', 'blockbuster', 'watch', 'play',
      'ছায়াছবি', 'নাটক', 'সিরিয়াল', 'সিনেমা', 'পরামর্শ'
    ];
    if (triggerWords.some(word => lowerText.includes(word))) {
      // Return a set of featured, high-rating, or first few movies
      return movies.slice(0, 3);
    }

    return [];
  };

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = language === 'Bengali' ? 'bn-BD' : 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        if (typeof playInterfaceTick === 'function') playInterfaceTick();
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setMessages(prev => [...prev, {
            id: `system-mic-err-${Date.now()}`,
            sender: 'ai',
            text: "Microphone permission is blocked by your browser or the preview frame settings. To speak with me: 1) Please allow microphone access in your browser's address bar settings, or 2) Open Elite Plex in a new tab using the settings menu, or 3) Simply type your query in the input field below! I am ready to assist.",
            timestamp: new Date()
          }]);
        }
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          handleSendMessage(transcript);
        }
      };

      recognitionRef.current = rec;
    }
  }, [language]);

  // Handle auto scroll
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Stop synthesis when closed
  useEffect(() => {
    if (!isOpen && synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  }, [isOpen]);

  const toggleListen = () => {
    if (typeof playInterfaceTick === 'function') playInterfaceTick();
    if (!recognitionRef.current) {
      alert("Speech Recognition is not supported or permission was denied in this browser tab.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      recognitionRef.current.start();
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    if (typeof playInterfaceTick === 'function') playInterfaceTick();

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: 'user',
      text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsThinking(true);

    // Check for a quick conversational greeting first (keeps it super snappy and handles offline cleanly)
    const localGreeting = getSimpleGreetingReply(text, selectedPersona.id);
    if (localGreeting) {
      setTimeout(() => {
        const aiMsg: ChatMessage = {
          id: Math.random().toString(),
          sender: 'ai',
          text: localGreeting,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMsg]);
        setIsThinking(false);
        if (speechEnabled) {
          speakResponse(localGreeting);
        }
      }, 500); // 500ms realistic thinking delay for luxury feel
      return;
    }

    try {
      const response = await fetch('/api/voice/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          persona: selectedPersona.id,
          language: language,
          availableMovies: movies.map((m) => m.title)
        })
      });

      const data = await response.json();
      const replyText = data.response || "I didn't quite catch that. Could you try again?";

      const aiMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: 'ai',
        text: replyText,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMsg]);
      setIsThinking(false);

      if (speechEnabled) {
        speakResponse(replyText);
      }
    } catch (err) {
      console.error(err);
      setIsThinking(false);
      const errorMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: 'ai',
        text: "I encountered a galactic interference. Please make sure my Gemini key is online, or type again!",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  const speakResponse = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Choose voice based on language and fallback
    const voices = synthRef.current.getVoices();
    let selectedVoice = null;

    if (language === 'Bengali') {
      selectedVoice = voices.find(v => v.lang.includes('bn') || v.lang.includes('IN'));
    } else {
      // Find suitable English voice
      if (selectedPersona.id === 'action-hero') {
        selectedVoice = voices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('google us'));
      } else if (selectedPersona.id === 'cozy-narrator') {
        selectedVoice = voices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('natural'));
      }
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.pitch = selectedPersona.pitch;
    utterance.rate = selectedPersona.rate;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    currentUtteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage(inputText);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/75 backdrop-blur-md p-0 sm:p-4 pointer-events-auto">
          {/* Click outside to close */}
          <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

          <motion.div
            initial={{ opacity: 0, y: 150, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 150, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 220 }}
            className={`relative w-full max-w-[480px] h-[85vh] sm:h-[680px] flex flex-col rounded-t-3xl sm:rounded-3xl border shadow-2xl overflow-hidden z-10 ${
              isDarkMode 
                ? 'bg-[#121010] border-white/[0.08] text-white' 
                : 'bg-stone-50 border-black/[0.12] text-stone-900'
            }`}
          >
            {/* Top ambient glow */}
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-gold-base/10 to-transparent pointer-events-none" />

            {/* Console Header */}
              <div className="relative z-10 flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl gold-gradient-bg flex items-center justify-center text-black shadow-inner shadow-white/20">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-tech font-extrabold tracking-wide uppercase text-gold-base flex items-center gap-1.5">
                      ELITE VOICE MODEL
                      <span className="text-[7px] bg-red-500/10 text-red-400 border border-red-500/20 px-1 rounded tracking-widest font-mono">LIVE</span>
                    </h3>
                    <p className="text-[10px] opacity-50 font-sans">Gemini 3.5 Flash powered AI companion</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (typeof playInterfaceTick === 'function') playInterfaceTick();
                      setSpeechEnabled(!speechEnabled);
                    }}
                    title={speechEnabled ? "Mute Voice Out" : "Enable Voice Out"}
                    className={`p-2 rounded-full border active:scale-90 transition-all ${
                      speechEnabled
                        ? 'border-gold-base/20 bg-gold-base/5 text-gold-base'
                        : 'border-white/[0.08] text-white/40'
                    }`}
                  >
                    {speechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => {
                      if (typeof playInterfaceTick === 'function') playInterfaceTick();
                      setIsOpen(false);
                    }}
                    className="p-2 rounded-full hover:bg-white/5 text-white/60 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Persona Selection Row */}
              <div className="p-3 bg-black/25 flex items-center gap-2.5 overflow-x-auto shrink-0 scrollbar-none border-b border-white/[0.04]">
                {PERSONAS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (typeof playInterfaceTick === 'function') playInterfaceTick();
                      setSelectedPersona(p);
                      if (synthRef.current) synthRef.current.cancel();
                      setIsSpeaking(false);
                      // Custom welcome for persona switch
                      let greet = `Voice model switched to ${p.name}. Ask me anything!`;
                      if (p.id === 'action-hero') greet = "Action Hero online. Ready to roll. What's the mission?";
                      if (p.id === 'sci-fi') greet = "Systems active. Space Commander AI operating at peak efficiency.";
                      if (p.id === 'cozy-narrator') greet = "Welcome, friend. Let's find a cozy, beautiful movie for your evening.";
                      setMessages(prev => [...prev, {
                        id: Math.random().toString(),
                        sender: 'ai',
                        text: greet,
                        timestamp: new Date()
                      }]);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-sans font-medium whitespace-nowrap active:scale-95 transition-all ${
                      selectedPersona.id === p.id
                        ? 'bg-gold-base text-black border-gold-base font-semibold shadow-md shadow-gold-base/15'
                        : 'bg-white/5 border-white/[0.06] text-white/70 hover:bg-white/10 hover:border-white/15'
                    }`}
                  >
                    <span>{p.avatar}</span>
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>

              {/* Chat Message Logs */}
              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
                {messages.map((m, idx) => {
                  const matchedMovies = m.sender === 'ai' ? getMatchedMoviesForText(m.text) : [];
                  return (
                    <div
                      key={`msg-${m.id || idx}-${idx}`}
                      className={`flex flex-col max-w-[85%] ${
                        m.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
                      }`}
                    >
                      <div
                        className={`px-4 py-3 rounded-2xl text-[12.5px] leading-relaxed font-sans shadow ${
                          m.sender === 'user'
                            ? 'bg-gold-base text-black font-medium rounded-tr-none'
                            : isDarkMode
                              ? 'bg-white/[0.04] border border-white/[0.06] text-white/90 rounded-tl-none'
                              : 'bg-stone-100 border border-stone-200 text-stone-900 rounded-tl-none'
                        }`}
                      >
                        {m.text}
                      </div>

                      {/* Display interactive Movie or Series cards inside/under AI Assistant message */}
                      {m.sender === 'ai' && matchedMovies.length > 0 && (
                        <div className="mt-3 flex flex-col gap-1.5 w-full max-w-sm text-left">
                          <div className="flex items-center gap-1.5 text-[8px] font-mono text-gold-base tracking-widest uppercase font-extrabold px-1">
                            <Flame className="w-3.5 h-3.5 text-gold-base animate-pulse shrink-0" />
                            RECOMMENDED TITLES ({matchedMovies.length})
                          </div>
                          <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-none snap-x w-full">
                            {matchedMovies.map((movie, index) => (
                              <div
                                key={`${m.id}-movie-${movie.id}-${index}`}
                                className="flex-none w-[110px] snap-start flex flex-col gap-1.5 group cursor-pointer"
                                onClick={() => {
                                  if (typeof playInterfaceTick === 'function') playInterfaceTick();
                                  onSelectMovie(movie);
                                }}
                              >
                                {/* Card Poster Frame */}
                                <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden border border-white/5 bg-black/40 shadow-md group-hover:border-gold-base/50 transition-all">
                                  <img
                                    src={movie.posterUrl}
                                    alt={movie.title}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                  {/* Type badge overlay */}
                                  <div className="absolute top-1.5 left-1.5 bg-black/85 backdrop-blur-md px-1.5 py-0.5 rounded text-[6.5px] font-mono uppercase font-bold tracking-wider text-gold-base border border-gold-base/20">
                                    {movie.type === 'series' ? 'SERIES' : 'MOVIE'}
                                  </div>
                                  {/* Rating overlay */}
                                  <div className="absolute bottom-1.5 left-1.5 bg-black/85 backdrop-blur-md px-1.5 py-0.5 rounded-full flex items-center gap-0.5 text-[7px] text-white">
                                    <span className="text-gold-base">★</span>
                                    <span>{movie.rating}</span>
                                  </div>
                                </div>
                                {/* Card Meta Info */}
                                <div className="px-0.5 flex flex-col min-w-0">
                                  <h5 className="text-[9.5px] font-semibold text-white/95 truncate uppercase leading-tight group-hover:text-gold-base transition-colors">
                                    {movie.title}
                                  </h5>
                                  <span className="text-[7px] font-mono text-white/40 uppercase mt-0.5 truncate">
                                    {movie.genres && movie.genres[0]} • {movie.year}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <span className="text-[8px] opacity-40 mt-1 font-mono">
                        {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}

                {isThinking && (
                  <div className="flex items-center gap-2 text-gold-base/80 text-[11px] font-mono self-start py-2">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-base opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-gold-base"></span>
                    </span>
                    <span>Gemini thinking...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Immersive Voice Soundwave visualization box */}
              {(isListening || isSpeaking) && (
                <div className="h-16 bg-black/40 flex flex-col items-center justify-center gap-2 px-5 shrink-0 border-t border-white/[0.04]">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((bar) => {
                      let delayVal = bar * 0.08;
                      let animDuration = isListening ? 0.6 : 0.4;
                      return (
                        <motion.div
                          key={bar}
                          animate={{
                            height: isListening 
                              ? [8, 36, 12, 28, 8]
                              : [12, 48, 16, 32, 12]
                          }}
                          transition={{
                            duration: animDuration,
                            repeat: Infinity,
                            delay: delayVal,
                            ease: "easeInOut"
                          }}
                          className={`w-1 rounded-full ${
                            isListening ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-gold-base shadow-[0_0_8px_rgba(212,175,55,0.5)]'
                          }`}
                          style={{ height: '12px' }}
                        />
                      );
                    })}
                  </div>
                  <span className="text-[9px] tracking-wider uppercase font-tech text-gold-base animate-pulse">
                    {isListening ? "Listening closely..." : `Speaking: ${selectedPersona.name}`}
                  </span>
                </div>
              )}

              {/* Input Control Area */}
              <div className="p-4 border-t border-white/[0.06] flex items-center gap-3 bg-black/15 shrink-0">
                <button
                  onClick={toggleListen}
                  title={isListening ? "Stop listening" : "Talk via Mic"}
                  className={`w-12 h-12 rounded-full flex items-center justify-center active:scale-95 transition-all duration-300 shadow relative overflow-hidden shrink-0 ${
                    isListening
                      ? 'bg-red-500 border-red-400 text-white animate-pulse shadow-lg shadow-red-500/30'
                      : 'bg-white/5 border border-white/[0.08] hover:border-white/20 text-white/80 hover:text-white'
                  }`}
                >
                  {isListening ? (
                    <Mic className="w-5 h-5 text-white animate-bounce" />
                  ) : (
                    <Mic className="w-5 h-5 text-gold-base" />
                  )}
                </button>

                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={isListening ? "Listening..." : "Ask about movie suggestions, ratings..."}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-full pl-5 pr-12 py-3 text-sm focus:outline-none focus:border-gold-base/50 focus:bg-white/[0.08] transition-all placeholder:text-white/20"
                    disabled={isListening}
                  />

                  <button
                    onClick={() => handleSendMessage(inputText)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-white/5 rounded-full text-gold-base disabled:opacity-40"
                    disabled={!inputText.trim() || isListening}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
  );
}
