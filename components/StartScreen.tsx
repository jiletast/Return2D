import React, { useState, useRef } from 'react';
import type { Project } from '../types';
import { 
    Plus, 
    Upload, 
    Trash2, 
    Clock, 
    Settings, 
    Code, 
    ChevronRight,
    FolderOpen,
    Box
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { motion, AnimatePresence } from 'motion/react';

interface StartScreenProps {
  projects: Project[];
  onLoadProject: (projectId: string) => void;
  onCreateProject: () => void;
  onDeleteProject: (projectId: string) => void;
  onImportProject: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpdateProjectIcon: (projectId: string, icon: string) => void;
}

const GAME_ICONS = ['🎮', '👾', '🚀', '🧱', '🤠', '⚔️', '⚽', '🪄', '🏰', '💎', '🍎', '🦖', '👻', '👽', '👑', '🌟', '🐱', '🦊', '🦄', '🍕', '🚗', '✈️', '🏝️', '🌋', '🎯', '🎸', '🎨', '🧩', '🔑', '❤️'];

const StartScreen: React.FC<StartScreenProps> = ({ projects, onLoadProject, onCreateProject, onDeleteProject, onImportProject, onUpdateProjectIcon }) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [projectToConfirmDelete, setProjectToConfirmDelete] = useState<Project | null>(null);
  const [pickerProjectId, setPickerProjectId] = useState<string | null>(null);
  const sortedProjects = [...projects].sort((a, b) => b.lastModified - a.lastModified);

  return (
    <div className="flex flex-col h-screen bg-[#080808] text-[#e0e0e0] font-sans overflow-hidden select-none">
      <div className="flex flex-grow overflow-hidden relative">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-800/10 blur-[100px] rounded-full translate-y-1/3 -translate-x-1/4 pointer-events-none" />

        {/* Sidebar / Left Branding Panel */}
        <div className="w-80 bg-[#111111]/80 backdrop-blur-md border-r border-[#222222] flex flex-col p-10 shrink-0 z-10">
          <div className="mb-14 flex flex-col gap-2">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.3)]">
                    <Box size={24} className="text-white" />
                </div>
                <h1 className="text-xl font-black tracking-tighter text-white uppercase italic leading-none">
                    Return 2D<br/><span className="text-[10px] tracking-[0.4em] not-italic text-indigo-400">ENGINE v4</span>
                </h1>
            </div>
          </div>

          <div className="flex-grow space-y-6">
            <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1 mb-2">Comenzar</span>
                <button 
                    onClick={onCreateProject}
                    className="group relative w-full flex items-center gap-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-6 rounded-xl shadow-2xl transition-all overflow-hidden"
                >
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <Plus size={20} className="relative z-10" />
                    <span className="relative z-10 text-sm uppercase tracking-wider">Nuevo Proyecto</span>
                </button>
                
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-4 bg-[#1a1a1a] hover:bg-[#222222] text-gray-300 font-bold py-3 px-6 rounded-xl border border-[#333333] transition-all"
                >
                    <Upload size={16} />
                    <span className="text-xs uppercase tracking-widest">Importar</span>
                </button>
            </div>

            <div className="flex flex-col gap-2 pt-4">
                 <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1 mb-2">Herramientas</span>
                 <button className="w-full flex items-center gap-4 px-6 py-2 text-gray-500 hover:text-indigo-400 transition-colors text-xs font-bold uppercase tracking-widest">
                    <Code size={16} /> Recursos PRO
                 </button>
                 <button className="w-full flex items-center gap-4 px-6 py-2 text-gray-500 hover:text-indigo-400 transition-colors text-xs font-bold uppercase tracking-widest">
                    <Settings size={16} /> Ajustes Motor
                 </button>
            </div>

            <input type="file" ref={fileInputRef} onChange={onImportProject} accept=".json" className="hidden" />
          </div>

          <div className="mt-auto pt-8 border-t border-white/5 opacity-40">
            <p className="text-[9px] text-gray-500 font-mono tracking-widest uppercase">© 2026 RETURN ENGINE TEAM</p>
          </div>
        </div>

        {/* Project List / Right Panel */}
        <div className="flex-grow flex flex-col bg-transparent overflow-y-auto no-scrollbar z-10">
          <div className="max-w-4xl w-full mx-auto py-20 px-10">
            <header className="mb-12 flex items-end justify-between border-b border-white/5 pb-8">
              <div className="flex flex-col gap-2">
                <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">RECIENTES</h2>
                <p className="text-xs text-gray-500 font-medium font-mono uppercase tracking-[0.3em]">Gestiona tus creaciones</p>
              </div>
              <div className="flex items-center gap-2 bg-[#1a1a1a] px-4 py-2 rounded-full border border-white/5 scale-90">
                <FolderOpen size={14} className="text-indigo-500" />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">{projects.length} Instalados</span>
              </div>
            </header>

            <div className="grid gap-4">
              <AnimatePresence mode="popLayout">
                {sortedProjects.map((project, idx) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05, duration: 0.4 }}
                    className="group relative bg-[#111111]/40 border border-white/5 hover:border-indigo-500/50 rounded-2xl p-6 flex items-center justify-between transition-all cursor-pointer backdrop-blur-sm overflow-hidden"
                    onClick={() => onLoadProject(project.id)}
                  >
                    <div className="absolute inset-x-0 bottom-0 h-[2px] bg-indigo-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                    
                    <div className="flex items-center gap-6 relative z-10">
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPickerProjectId(pickerProjectId === project.id ? null : project.id);
                          }}
                          className="w-14 h-14 rounded-xl bg-indigo-500/10 flex items-center justify-center text-3xl border border-indigo-500/30 hover:bg-indigo-600 hover:text-white hover:scale-110 hover:rotate-3 transition-all shadow-xl shadow-indigo-500/0 hover:shadow-indigo-500/20 overflow-hidden p-0"
                          title="Cambiar Icono"
                        >
                          {project.icon && (project.icon.startsWith('data:image/') || project.icon.startsWith('http://') || project.icon.startsWith('https://')) ? (
                            <img src={project.icon} alt="Project Icon" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            project.icon || '🎮'
                          )}
                        </button>
                        
                        {pickerProjectId === project.id && (
                          <div 
                            className="absolute top-16 left-0 bg-[#161616] border border-[#333333] rounded-xl shadow-2xl p-3 z-[100] w-64 flex flex-col gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 pb-1 border-b border-white/5">
                              Cambiar Icono del Proyecto
                            </div>
                            <div className="grid grid-cols-6 gap-2">
                              {GAME_ICONS.map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdateProjectIcon(project.id, emoji);
                                    setPickerProjectId(null);
                                  }}
                                  className={`w-8 h-8 rounded-lg text-center text-lg flex items-center justify-center hover:bg-indigo-600/30 transition-all ${project.icon === emoji ? 'bg-indigo-600/40 text-white border border-indigo-500' : 'text-gray-300'}`}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                            <div className="mt-2 pt-2 border-t border-white/5">
                              <label className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-505 text-white rounded-lg text-xs cursor-pointer transition-all font-medium">
                                <Upload size={14} />
                                <span>Subir de PC / Móvil</span>
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden" 
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = () => {
                                        if (typeof reader.result === 'string') {
                                          onUpdateProjectIcon(project.id, reader.result);
                                          setPickerProjectId(null);
                                        }
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <h3 className="text-xl font-bold text-gray-300 group-hover:text-white transition-colors">{project.name}</h3>
                        <div className="flex items-center gap-3 text-gray-500">
                             <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-tighter uppercase">
                                <Clock size={12} className="opacity-50" />
                                <span>{new Date(project.lastModified).toLocaleDateString()}</span>
                                <span className="opacity-30 mx-1">|</span>
                                <span>{new Date(project.lastModified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                             </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 relative z-10">
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full text-[9px] font-bold text-gray-400 group-hover:text-indigo-400 transition-colors uppercase tracking-widest border border-transparent group-hover:border-indigo-500/30">
                        Abrir <ChevronRight size={10} />
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectToConfirmDelete(project);
                        }}
                        className="p-2.5 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                        title={t('start.delete')}
                      >
                         <Trash2 size={18} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {projects.length === 0 && (
                <div className="py-24 text-center border border-dashed border-[#222222] rounded-3xl group bg-[#111111]/20">
                   <div className="w-16 h-16 bg-[#1a1a1a] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/5 opacity-50">
                        <Plus size={32} className="text-gray-500" />
                   </div>
                   <p className="text-gray-600 font-mono uppercase tracking-[0.4em] text-[10px] font-bold">Comienza un nuevo proyecto para dar vida a tus ideas</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {projectToConfirmDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4 backdrop-blur-md"
            onClick={() => setProjectToConfirmDelete(null)}
          >
            <motion.div 
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                className="bg-[#111111] border border-red-900/20 rounded-2xl shadow-[0_0_100px_rgba(220,38,38,0.1)] w-full max-w-sm p-10 select-none" 
                onClick={e => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-600/10 rounded-2xl flex items-center justify-center mb-6 border border-red-600/20 mx-auto">
                 <Trash2 size={32} className="text-red-500" />
              </div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white text-center mb-2">¿Eliminar Proyecto?</h2>
              <p className="text-gray-500 text-sm mb-10 leading-relaxed text-center">
                Estás a punto de borrar <span className="text-white font-bold">"{projectToConfirmDelete.name}"</span>.<br/>Esta acción vaporizará todos los datos de forma permanente.
              </p>
              <div className="flex gap-4">
                <button 
                    onClick={() => setProjectToConfirmDelete(null)} 
                    className="flex-1 py-4 bg-[#1a1a1a] hover:bg-[#222222] text-gray-400 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-colors border border-white/5"
                >
                    {t('common.cancel') || 'Abortar'}
                </button>
                <button 
                  onClick={() => {
                    onDeleteProject(projectToConfirmDelete.id);
                    setProjectToConfirmDelete(null);
                  }}
                  className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] transition-colors shadow-xl shadow-red-600/20 shadow-lg"
                >
                  {t('common.delete') || 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StartScreen;
