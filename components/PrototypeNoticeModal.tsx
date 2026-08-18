import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export const PrototypeNoticeModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem('return_engine_prototype_notice_seen');
    if (!hasSeen) {
      setIsOpen(true);
    }
  }, []);

  const handleAgree = () => {
    localStorage.setItem('return_engine_prototype_notice_seen', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
      <div 
        className="bg-[#141417] border border-amber-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden flex flex-col gap-5 text-gray-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Glow accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-indigo-500 to-amber-500" />

        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <AlertTriangle size={22} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white uppercase tracking-wider italic">
              Aviso del Prototipo
            </h3>
            <p className="text-[11px] text-amber-400 font-medium">
              Return 2D Engine
            </p>
          </div>
        </div>

        <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
          Este motor es un prototipo inicial y puede contener algunos errores o bugs escondidos que se solucionarán en el futuro si tiene algún problema contáctese por <a href="mailto:akinmarpower@proton.me" className="text-indigo-400 underline font-semibold hover:text-indigo-300">akinmarpower@proton.me</a> gracias por su atención manual.
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={handleAgree}
            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-indigo-600/30 flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={16} />
            De acuerdo
          </button>
        </div>
      </div>
    </div>
  );
};
