import React from 'react';
import { Shield, X, Lock, Eye, Database, Smartphone, CheckCircle, Server } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div 
        className="bg-[#121214] border border-[#2a2a2e] rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#18181b] border-b border-[#2a2a2e] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider italic">
                Política de Privacidad
              </h2>
              <p className="text-[11px] text-gray-400 font-mono">
                Return 2D Engine • Última actualización: Agosto 2026
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-gray-300 leading-relaxed custom-scrollbar">
          
          <div className="p-4 bg-indigo-950/30 border border-indigo-500/20 rounded-xl flex items-start gap-3">
            <Lock className="text-indigo-400 shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="font-bold text-white text-xs mb-1">Compromiso con la Privacidad Local (Offline-First)</h4>
              <p className="text-[11px] text-gray-300">
                Return 2D Engine opera prioritariamente de forma local e independiente en tu navegador o dispositivo. Tus proyectos, sprites, scripts y configuraciones se guardan localmente mediante almacenamiento persistente (IndexedDB / LocalStorage) y nunca se transmiten a servidores externos sin tu consentimiento expreso.
              </p>
            </div>
          </div>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-1">
              <Eye size={14} className="text-indigo-400" /> 1. Información que Recopilamos
            </h3>
            <p>
              El motor **Return 2D Engine** no recopila, vende ni rastrea información personal de identificación (PII) de los usuarios.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[11px] text-gray-400">
               font-semibold text-gray-300:<strong className="text-gray-200">Datos de Proyectos Local:</strong> Los archivos de proyecto (`.json`), imágenes, audios y escenas se almacenan de forma totalmente privada dentro de tu propio navegador.
              <li className="text-[11px] text-gray-400"><strong className="text-gray-200">Preferencia de Idioma y Configuración:</strong> Guardamos tus preferencias de idioma y tema localmente para mejorar la experiencia de usuario.</li>
              <li className="text-[11px] text-gray-400"><strong className="text-gray-200">Sin Seguimiento ni Cookies de Terceros:</strong> No utilizamos cookies publicitarias ni herramientas de rastreo invasivas dentro de la interfaz del editor.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-1">
              <Database size={14} className="text-indigo-400" /> 2. Juegos Exportados (HTML5 / Android / APK)
            </h3>
            <p>
              Cuando exportas tu juego creado con Return 2D Engine a formato HTML5 o empaquetado para Google Play Store:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[11px] text-gray-400">
              <li className="text-[11px] text-gray-400"><strong className="text-gray-200">Autonomía del Desarrollador:</strong> Como creador del juego, tú eres responsable del contenido y los permisos adicionales que incluyas en tu APK/App.</li>
              <li className="text-[11px] text-gray-400"><strong className="text-gray-200">Motor de Juego Autónomo:</strong> El ejecutable generado del juego no incluye telemetría oculta, spyware ni rastreadores integrados por Return 2D Engine.</li>
              <li className="text-[11px] text-gray-400"><strong className="text-gray-200">Guardado de Partida:</strong> El progreso del juego se almacena localmente en la memoria del dispositivo del jugador mediante LocalStorage o IndexedDB estándar.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-1">
              <Smartphone size={14} className="text-indigo-400" /> 3. Permisos del Dispositivo
            </h3>
            <p>
              Return 2D Engine y los juegos exportados únicamente solicitan acceso a funciones del dispositivo cuando son explícitamente requeridas para la jugabilidad o el desarrollo:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                <p className="font-bold text-gray-200 text-[11px]">📁 Almacenamiento / Archivos</p>
                <p className="text-[10px] text-gray-400">Para importar sprites, fuentes, audios y guardar/exportar los proyectos `.json` y `.html`.</p>
              </div>
              <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                <p className="font-bold text-gray-200 text-[11px]">🔊 Audio / Reproducción</p>
                <p className="text-[10px] text-gray-400">Para sintetizar y reproducir los efectos de sonido y bandas sonoras creadas en el AudioLab.</p>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-1">
              <Server size={14} className="text-indigo-400" /> 4. Seguridad y Derechos del Usuario
            </h3>
            <p>
              Tienes el control total de tus datos en todo momento. Puedes exportar una copia completa de tus proyectos en JSON o borrar la memoria local del navegador cuando lo desees.
            </p>
          </section>

          <section className="pt-2 border-t border-white/10 text-center text-[10px] text-gray-500">
            <p>Return 2D Engine • Compromiso con la Privacidad del Creador</p>
          </section>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#18181b] border-t border-[#2a2a2e] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-indigo-400 text-[11px]">
            <CheckCircle size={14} />
            <span>Motor Privado y Conforme a RGPD/CCPA</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-lg hover:shadow-indigo-600/20"
          >
            Aceptar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
