import React, { useState } from 'react';
import type { ProjectData } from '../types';
import { generateGameHTML } from '../services/exportService';
import { useLanguage } from '../LanguageContext';

interface ExportModalProps {
  onClose: () => void;
  projectData?: ProjectData | null;
  initialShowCode?: boolean;
}

export const ExportModal: React.FC<ExportModalProps> = ({ onClose, projectData, initialShowCode = false }) => {
  const { t } = useLanguage();
  const [showCode, setShowCode] = useState(initialShowCode);
  const [viewType, setViewType] = useState<'HTML' | 'JSON'>('HTML');
  const [exportFileName, setExportFileName] = useState(() => {
    if (projectData && projectData.scenes && projectData.scenes.length > 0) {
      return projectData.scenes[0].name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    }
    return 'mi_juego_2d';
  });
  const [generatedCode, setGeneratedCode] = useState(initialShowCode ? generateGameHTML(projectData) : '');
  
  const handleExport = async (platform: string) => {
      let extension = '.html';
      let mimeType = 'text/html';
      let content: string | Blob = '';

      if (platform === 'HTML5') {
          content = generateGameHTML(projectData);
          if (!content) { alert(t('export.noData') || 'No hay datos del proyecto'); return; }
          extension = '.html';
          mimeType = 'text/html';
      } else if (platform === 'JSON') {
          if (!projectData) return;
          content = JSON.stringify(projectData, null, 2);
          extension = '.json';
          mimeType = 'application/json';
      }

      const baseName = exportFileName.trim() || 'juego';
      const finalFilename = baseName.toLowerCase().endsWith(extension) ? baseName : baseName + extension;

      // Try modern File System Access API (only if not in an iframe)
      if ('showSaveFilePicker' in window && window.self === window.top) {
          try {
              const handle = await (window as any).showSaveFilePicker({
                  suggestedName: finalFilename,
                  types: [{
                      description: `${platform} File`,
                      accept: { [mimeType]: [extension] },
                  }],
              });
              const writable = await handle.createWritable();
              const blobContent = (typeof content !== 'string') ? content : new Blob([content], { type: mimeType });
              await writable.write(blobContent);
              await writable.close();
              onClose();
              return;
          } catch (err) {
              if ((err as Error).name === 'AbortError') return;
              console.error('File System Access API failed, falling back...', err);
          }
      }

      // Safe download fallback - completely eliminates blocking prompt()
      const blob = (typeof content !== 'string') ? content : new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = finalFilename;
      document.body.appendChild(a);
      a.click();
      
      // Delay removal slightly so the browser registers the download action
      setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
      }, 100);

      onClose();
  };

  const handleHandleViewCode = (platform: 'HTML5' | 'JSON') => {
    if (platform === 'HTML5') {
        const htmlContent = generateGameHTML(projectData);
        if (!htmlContent) {
            alert(t('export.noData') || 'No hay datos del proyecto');
            return;
        }
        setGeneratedCode(htmlContent);
        setViewType('HTML');
    } else {
        if (!projectData) return;
        setGeneratedCode(JSON.stringify(projectData, null, 2));
        setViewType('JSON');
    }
    setShowCode(true);
  };
  
  const ExportOption: React.FC<{ 
    title: string; 
    description: string; 
    icon: React.ReactNode; 
    onExport: () => void; 
    onViewCode?: () => void;
    viewCodeLabel?: string;
  }> = ({ title, description, icon, onExport, onViewCode, viewCodeLabel }) => {
    return (
        <div className="p-4 rounded-xl flex flex-col md:flex-row md:items-center gap-4 transition-all bg-gray-900/50 border border-gray-700/50 hover:border-indigo-500/30">
            <div className="flex items-center gap-4 flex-grow">
                <div className="p-3 rounded-lg bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                    {icon}
                </div>
                <div>
                    <h4 className="font-bold text-white tracking-tight">
                        {title}
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{description}</p>
                </div>
            </div>
            <div className="flex gap-2 justify-end mt-2 md:mt-0">
                {onViewCode && (
                    <button 
                        onClick={onViewCode} 
                        className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-colors border border-gray-700"
                    >
                        {viewCodeLabel || 'Ver Código'}
                    </button>
                )}
                <button 
                    onClick={onExport} 
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-all shadow-lg hover:shadow-indigo-600/20"
                >
                    Exportar
                </button>
            </div>
        </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#18181b] rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col border border-gray-800 max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0">
          <h2 className="text-lg font-black tracking-tight uppercase text-white">
            {showCode ? (viewType === 'HTML' ? t('export.codeTitle') : 'Código de Datos JSON') : t('export.title')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl font-bold leading-none select-none transition-colors">&times;</button>
        </header>

        <main className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
            {showCode ? (
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-gray-900/30 p-3 rounded-lg border border-gray-800">
                        <p className="text-gray-400 text-xs leading-relaxed">
                            {viewType === 'HTML' ? t('export.codeDescription') : 'Aquí tienes los parámetros de configuración JSON de tu proyecto:'}
                        </p>
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(generatedCode);
                                alert(t('export.codeCopied') || '¡Copiado con éxito!');
                            }}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-md transition-colors shadow-sm shrink-0 ml-4"
                        >
                            {t('export.copyCode') || 'Copiar'}
                        </button>
                    </div>
                    <pre className="bg-black/40 p-4 rounded-xl overflow-x-auto text-xs font-mono text-indigo-300 border border-gray-800 max-h-[45vh] custom-scrollbar selection:bg-indigo-500/30 selection:text-white">
                        {generatedCode}
                    </pre>
                    <button 
                        onClick={() => setShowCode(false)}
                        className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                        {t('export.backToOptions') || 'Volver'}
                    </button>
                </div>
            ) : (
                <>
                    {/* Filename configure inline */}
                    <div className="bg-gray-900/30 p-4 rounded-xl border border-gray-800 space-y-2">
                        <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">
                            Nombre del Archivo de Destino
                        </label>
                        <div className="flex gap-2 items-center">
                            <input 
                                type="text"
                                value={exportFileName}
                                onChange={(e) => setExportFileName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '_'))}
                                placeholder="mi_juego"
                                className="bg-[#0c0c0e] border border-gray-800 hover:border-gray-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none w-full transition-all font-mono"
                            />
                            <span className="text-xs font-mono text-gray-500 bg-[#0c0c0e] px-2 py-2 rounded-lg border border-gray-800 select-none">
                                .html / .json
                            </span>
                        </div>
                        <span className="text-[10px] text-gray-500 block leading-relaxed">
                            Introduce el nombre del instalador o archivo exportado sin extensión (solo letras, números y guiones).
                        </span>
                    </div>

                    {/* Joystick option */}
                    {projectData?.joystick && (
                        <div className="bg-gray-900/30 p-4 rounded-xl border border-gray-800 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">
                                    Control Joystick Táctil
                                </span>
                                <span className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                                    Habilitar joystick virtual en pantallas táctiles o móviles
                                </span>
                            </div>
                            <button
                                onClick={() => {
                                    if (projectData.joystick) {
                                        projectData.joystick.enabled = !projectData.joystick.enabled;
                                        setExportFileName(prev => prev); // force render update
                                    }
                                }}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all border ${
                                    projectData.joystick.enabled 
                                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md hover:bg-indigo-500' 
                                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                                }`}
                            >
                                {projectData.joystick.enabled ? 'Habilitado' : 'Deshabilitado'}
                            </button>
                        </div>
                    )}

                    <p className="text-xs text-gray-400 leading-relaxed">Elige tu plataforma de destino para exportar los subsistemas:</p>
                    
                    <div className="space-y-3">
                        <ExportOption 
                            title="HTML5"
                            description={t('export.webDescription')}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}
                            onExport={() => handleExport('HTML5')}
                            onViewCode={() => handleHandleViewCode('HTML5')}
                            viewCodeLabel="Ver Código"
                        />
                        <ExportOption 
                            title={t('export.jsonTitle')}
                            description={t('export.jsonDescription')}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                            onExport={() => handleExport('JSON')}
                            onViewCode={() => handleHandleViewCode('JSON')}
                            viewCodeLabel="Ver JSON"
                        />
                    </div>
                </>
            )}
        </main>
      </div>
    </div>
  );
};
