import React, { useState, useEffect } from 'react';
import type { ProjectData } from '../types';
import { generateGameHTML, compressProjectAssets } from '../services/exportService';
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
  
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState('');
  const [optimizedProjectData, setOptimizedProjectData] = useState<ProjectData | null>(null);
  const [generatedCode, setGeneratedCode] = useState('');

  // Non-blocking custom dialog states
  const [customConfirm, setCustomConfirm] = useState<{
    title?: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
  } | null>(null);

  const [customAlert, setCustomAlert] = useState<{
    title?: string;
    message: string;
  } | null>(null);

  const getOptimizedData = async (): Promise<ProjectData | null> => {
    if (optimizedProjectData) return optimizedProjectData;
    if (!projectData) return null;
    
    setIsOptimizing(true);
    setOptimizationProgress('Iniciando optimizador de recursos...');
    try {
      const optimized = await compressProjectAssets(projectData, (msg) => {
        setOptimizationProgress(msg);
      });
      setOptimizedProjectData(optimized);
      return optimized;
    } catch (err) {
      console.error('Asset optimization failed:', err);
      return projectData;
    } finally {
      setIsOptimizing(false);
    }
  };

  useEffect(() => {
    if (initialShowCode && projectData) {
      getOptimizedData().then((optimized) => {
        if (optimized) {
          setGeneratedCode(generateGameHTML(optimized));
        }
      });
    }
  }, [initialShowCode, projectData]);

  const triggerStandardDownload = (content: string | Blob, filename: string, mimeType: string) => {
      const blob = (typeof content !== 'string') ? content : new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
      }, 100);
      onClose();
  };
  
  const handleExport = async (platform: string) => {
      let extension = '.html';
      let mimeType = 'text/html';
      let content: string | Blob = '';

      if (platform === 'HTML5') {
          const dataToUse = await getOptimizedData();
          content = generateGameHTML(dataToUse);
          if (!content) { 
              setCustomAlert({
                  title: 'Sin Datos',
                  message: t('export.noData') || 'No hay datos del proyecto'
              });
              return; 
          }
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

      // Try modern File System Access API
      if ('showSaveFilePicker' in window) {
          try {
              const handle = await (window as any).showSaveFilePicker({
                  suggestedName: finalFilename,
                  types: [{
                      description: platform === 'JSON' ? 'JSON Project File' : 'HTML5 Game File',
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
              // User cancelled
              if ((err as Error).name === 'AbortError') return;
              console.warn('File System Access API failed or blocked, explaining iframe constraints:', err);
              
              setCustomConfirm({
                  title: 'Selector bloqueado',
                  message: `⚠️ El navegador bloquea el Gestor de Archivos dentro del visor de diseño por seguridad.\n\nPara poder elegir la carpeta exacta en tu PC:\n1. Abre la app en pestaña nueva (botón superior derecho de la pantalla).\n2. Pulsa "Exportar" allí.\n\n¿Quieres guardarlo en "Descargas" automáticamente por ahora?`,
                  confirmText: 'Sí, Guardar',
                  cancelText: 'Cancelar',
                  onConfirm: () => triggerStandardDownload(content, finalFilename, mimeType)
              });
              return;
          }
      } else {
          setCustomConfirm({
              title: 'Selector no soportado',
              message: `⚠️ Tu navegador actual o visor interno no soporta la selección de carpeta directa.\n\n¿Quieres descargar el archivo directamente a tu carpeta de Descargas?`,
              confirmText: 'Descargar',
              cancelText: 'Cancelar',
              onConfirm: () => triggerStandardDownload(content, finalFilename, mimeType)
          });
          return;
      }
  };

  const handleExportBoth = async () => {
      const dataToUse = await getOptimizedData();
      const htmlContent = generateGameHTML(dataToUse);
      if (!htmlContent) { 
          setCustomAlert({
              title: 'Sin Datos',
              message: t('export.noData') || 'No hay datos del proyecto'
          });
          return; 
      }
      const jsonContent = projectData ? JSON.stringify(projectData, null, 2) : '';

      const baseName = exportFileName.trim() || 'juego';
      const htmlFilename = baseName.toLowerCase().endsWith('.html') ? baseName : baseName + '.html';
      const jsonFilename = baseName.toLowerCase().endsWith('.json') ? baseName : baseName + '.json';

      const triggerBothDownloadsFallback = () => {
          // Safe fallback - trigger sequential download of both files
          const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
          const htmlUrl = URL.createObjectURL(htmlBlob);
          const aHtml = document.createElement('a');
          aHtml.href = htmlUrl;
          aHtml.download = htmlFilename;
          document.body.appendChild(aHtml);
          aHtml.click();

          setTimeout(() => {
              document.body.removeChild(aHtml);
              URL.revokeObjectURL(htmlUrl);

              if (jsonContent) {
                  const jsonBlob = new Blob([jsonContent], { type: 'application/json' });
                  const jsonUrl = URL.createObjectURL(jsonBlob);
                  const aJson = document.createElement('a');
                  aJson.href = jsonUrl;
                  aJson.download = jsonFilename;
                  document.body.appendChild(aJson);
                  aJson.click();

                  setTimeout(() => {
                      document.body.removeChild(aJson);
                      URL.revokeObjectURL(jsonUrl);
                  }, 100);
              }
          }, 150);
          onClose();
      };

      // Try modern File System Access Directory Picker API first
      if ('showDirectoryPicker' in window) {
          try {
              const dirHandle = await (window as any).showDirectoryPicker({
                  mode: 'readwrite'
              });
              
              // Write HTML
              const htmlFileHandle = await dirHandle.getFileHandle(htmlFilename, { create: true });
              const htmlWritable = await htmlFileHandle.createWritable();
              await htmlWritable.write(new Blob([htmlContent], { type: 'text/html' }));
              await htmlWritable.close();

              // Write JSON
              if (jsonContent) {
                  const jsonFileHandle = await dirHandle.getFileHandle(jsonFilename, { create: true });
                  const jsonWritable = await jsonFileHandle.createWritable();
                  await jsonWritable.write(new Blob([jsonContent], { type: 'application/json' }));
                  await jsonWritable.close();
              }

              setCustomAlert({
                  title: '¡Guardado con éxito!',
                  message: '¡Los archivos HTML5 y JSON se han guardado correctamente en la carpeta que has seleccionado!'
              });
              onClose();
              return;
          } catch (err) {
              if ((err as Error).name === 'AbortError') return;
              console.warn('Directory Picker API failed or blocked, explaining iframe constraints:', err);

              setCustomConfirm({
                  title: 'Selector de carpeta bloqueado',
                  message: `⚠️ El navegador bloquea el selector de carpetas dentro del visor integrado por seguridad.\n\nPara poder elegir una carpeta exacta de tu PC:\n1. Abre la app en pestaña nueva (botón superior derecho de la pantalla).\n2. Pulsa "Exportar" -> "Guardar Ambos en Carpeta" allí.\n\n¿Quieres descargar ambos archivos automáticamente en tu carpeta "Descargas" por ahora?`,
                  confirmText: 'Sí, Guardar',
                  cancelText: 'Cancelar',
                  onConfirm: triggerBothDownloadsFallback
              });
              return;
          }
      } else {
          setCustomConfirm({
              title: 'Selector de carpeta no soportado',
              message: `⚠️ Tu navegador actual o visor interno no soporta la selección de carpeta directa.\n\n¿Quieres descargar ambos archivos automáticamente en tu carpeta de Descargas?`,
              confirmText: 'Descargar',
              cancelText: 'Cancelar',
              onConfirm: triggerBothDownloadsFallback
          });
          return;
      }
  };

  const handleCopyUrl = async (platform: 'HTML5' | 'JSON') => {
      let content = '';
      let mimeType = 'text/html';
      
      if (platform === 'HTML5') {
          const dataToUse = await getOptimizedData();
          content = generateGameHTML(dataToUse);
          mimeType = 'text/html';
      } else {
          if (!projectData) return;
          content = JSON.stringify(projectData, null, 2);
          mimeType = 'application/json';
      }

      if (!content) return;

      try {
          const base64Data = btoa(unescape(encodeURIComponent(content)));
          const dataUrl = `data:${mimeType};charset=utf-8;base64,${base64Data}`;

          await navigator.clipboard.writeText(dataUrl);

          setCustomAlert({
              title: '¡URL Copiada al Portapapeles!',
              message: `Se ha copiado la URL Data del ${platform}.\n\nPuedes pegarla directamente en la barra de direcciones de tu navegador para abrirlo y ejecutarlo automáticamente sin errores.`
          });
      } catch (err) {
          console.error('Error copying URL:', err);
          setCustomAlert({
              title: 'Error al Copiar URL',
              message: 'No se pudo copiar la URL al portapapeles. Inténtalo usando "Ver Código".'
          });
      }
  };

  const handleHandleViewCode = async (platform: 'HTML5' | 'JSON') => {
    if (platform === 'HTML5') {
        const dataToUse = await getOptimizedData();
        const htmlContent = generateGameHTML(dataToUse);
        if (!htmlContent) {
            setCustomAlert({
                title: 'Error de Código',
                message: t('export.noData') || 'No hay datos del proyecto'
            });
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
    onCopyUrl?: () => void;
    copyUrlLabel?: string;
  }> = ({ title, description, icon, onExport, onViewCode, viewCodeLabel, onCopyUrl, copyUrlLabel }) => {
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
            <div className="flex flex-wrap gap-2 justify-end mt-2 md:mt-0">
                {onCopyUrl && (
                    <button 
                        onClick={onCopyUrl} 
                        className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg transition-colors border border-emerald-500/30 flex items-center gap-1.5"
                    >
                        <span>🔗</span> {copyUrlLabel || 'Copiar URL'}
                    </button>
                )}
                {onViewCode && (
                    <button 
                        onClick={onViewCode} 
                        className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg transition-colors border border-gray-700"
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
      <div className="bg-[#18181b] rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col border border-gray-800 max-h-[90vh] relative overflow-hidden" onClick={e => e.stopPropagation()}>
        {isOptimizing && (
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center z-50 p-6 text-center">
            <div className="relative flex items-center justify-center mb-6">
              <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
              <div className="absolute w-10 h-10 rounded-full border-4 border-emerald-500/20 border-b-emerald-500 animate-spin [animation-direction:reverse]"></div>
            </div>
            <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2">
              Comprimiendo y Optimizando Recursos
            </h3>
            <p className="text-xs text-gray-400 font-mono max-w-md bg-gray-900/50 px-4 py-3 rounded-lg border border-gray-800">
              {optimizationProgress}
            </p>
            <span className="text-[10px] text-gray-500 mt-4 leading-relaxed max-w-sm">
              Reduciendo imágenes pesadas y pistas de audio para minimizar el peso del juego de MB a KB para una carga ultra rápida.
            </span>
          </div>
        )}
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
                                setCustomAlert({
                                    title: '¡Copiado con éxito!',
                                    message: t('export.codeCopied') || 'El código se ha copiado al portapapeles.'
                                });
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

                    {/* Tip for choosing a destination folder */}
                    <div className="p-4 bg-indigo-950/20 border border-indigo-500/20 rounded-xl text-xs flex gap-3 text-indigo-200">
                        <span className="text-lg shrink-0 select-none">💡</span>
                        <div className="space-y-1">
                            <p className="font-bold text-white text-xs">¿Quieres elegir la carpeta de destino al guardar?</p>
                            <p className="text-gray-400 text-[11px] leading-relaxed">
                                Para que el navegador te permita elegir la carpeta exacta al descargar, **abre la aplicación en una pestaña nueva** usando el botón de la esquina superior derecha de la pantalla.
                            </p>
                            <p className="text-gray-400 text-[11px] leading-relaxed">
                                En este visor integrado (iframe), el navegador bloquea las ventanas de selección de carpetas por seguridad y descarga los archivos automáticamente a tu carpeta de Descargas.
                            </p>
                        </div>
                    </div>

                    <p className="text-xs text-gray-400 leading-relaxed">Elige tu plataforma de destino para exportar los subsistemas:</p>
                    
                    <div className="space-y-3">
                        <ExportOption 
                            title="HTML5"
                            description={t('export.webDescription')}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}
                            onExport={() => handleExport('HTML5')}
                        />
                        <ExportOption 
                            title={t('export.jsonTitle')}
                            description={t('export.jsonDescription')}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                            onExport={() => handleExport('JSON')}
                            onViewCode={() => handleHandleViewCode('JSON')}
                            viewCodeLabel="Ver JSON"
                            onCopyUrl={() => handleCopyUrl('JSON')}
                            copyUrlLabel="Copiar URL"
                        />
                        <ExportOption 
                            title="Guardar Ambos en Carpeta (HTML + JSON)"
                            description="Selecciona una carpeta local para guardar simultáneamente el archivo HTML5 del juego y el de datos JSON."
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>}
                            onExport={handleExportBoth}
                        />
                    </div>
                </>
            )}
        </main>
      </div>

      {/* Custom Non-blocking confirmation overlay */}
      {customConfirm && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[99999] p-4" onClick={() => setCustomConfirm(null)}>
          <div className="bg-[#1f1f23] rounded-2xl shadow-2xl p-6 max-w-md w-full border border-gray-800" onClick={e => e.stopPropagation()}>
            {customConfirm.title && (
              <h3 className="text-base font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="text-indigo-400">📁</span> {customConfirm.title}
              </h3>
            )}
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap mb-6">
              {customConfirm.message}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setCustomConfirm(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold uppercase tracking-wider rounded-lg border border-gray-700 transition-colors"
              >
                {customConfirm.cancelText}
              </button>
              <button
                onClick={() => {
                  const confirmAction = customConfirm.onConfirm;
                  setCustomConfirm(null);
                  confirmAction();
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-lg hover:shadow-indigo-600/20"
              >
                {customConfirm.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Non-blocking alert overlay */}
      {customAlert && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[99999] p-4" onClick={() => setCustomAlert(null)}>
          <div className="bg-[#1f1f23] rounded-2xl shadow-2xl p-6 max-w-md w-full border border-gray-800" onClick={e => e.stopPropagation()}>
            {customAlert.title && (
              <h3 className="text-base font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="text-indigo-400">✨</span> {customAlert.title}
              </h3>
            )}
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap mb-6">
              {customAlert.message}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setCustomAlert(null)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-lg hover:shadow-indigo-600/20"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
