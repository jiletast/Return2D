import React from 'react';
import { motion } from 'motion/react';
import { Box } from 'lucide-react';

const SplashScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#080808] text-white overflow-hidden relative">
      {/* Cinematic Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/5 rounded-full blur-[150px]" />
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50 contrast-150" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="z-10 flex flex-col items-center"
      >
        <div className="relative mb-12">
            <motion.div 
                initial={{ rotate: -10, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 1, delay: 0.2 }}
                className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-[0_0_50px_rgba(79,70,229,0.4)]"
            >
                <Box size={40} className="text-white" />
            </motion.div>
            <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-xl"
            >
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-ping" />
            </motion.div>
        </div>

        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center gap-1"
        >
            <h1 className="text-3xl font-black tracking-tighter uppercase italic text-white flex items-center gap-2">
                Return 2D
            </h1>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.5em] ml-1">Editor Framework</span>
        </motion.div>
        
        <div className="mt-16 flex flex-col items-center gap-4">
          <div className="w-48 h-[2px] bg-white/5 relative overflow-hidden rounded-full">
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent w-full"
            />
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <motion.span 
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-[9px] font-mono text-gray-500 uppercase tracking-[0.4em]"
            >
                Cargando subsistemas...
            </motion.span>
          </div>
        </div>
      </motion.div>

      <div className="absolute bottom-12 flex flex-col items-center gap-3">
         <div className="px-3 py-1 bg-[#1a1a1a] rounded-full border border-white/5 flex items-center gap-2">
             <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
             <span className="text-[8px] font-mono text-gray-400 tracking-widest uppercase">Kernel 4.0.21 Secure</span>
         </div>
         <p className="text-[8px] text-gray-700 font-mono tracking-widest uppercase">© 2026 RETURN ENGINE TEAM</p>
      </div>
    </div>
  );
};

export default SplashScreen;
