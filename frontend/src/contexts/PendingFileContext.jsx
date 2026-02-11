import { createContext, useContext, useState, useEffect } from 'react';

const PendingFileContext = createContext();

export const usePendingFile = () => {
  const context = useContext(PendingFileContext);
  if (!context) {
    throw new Error('usePendingFile must be used within PendingFileProvider');
  }
  return context;
};

export const PendingFileProvider = ({ children }) => {
  const [pendingFilePath, setPendingFilePath] = useState(null);

  useEffect(() => {
    // Only set up listener if running in Electron
    if (window.electron) {
      console.log('[PendingFile] Setting up file open listener');

      const handleOpenFile = (filePath) => {
        console.log('[PendingFile] Received file to open:', filePath);
        setPendingFilePath(filePath);
      };

      window.electron.onOpenLocalFile(handleOpenFile);

      // Request any pending file on mount (in case file was opened before React loaded)
      window.electron.requestPendingFile();
    }
  }, []);

  const clearPendingFile = () => {
    setPendingFilePath(null);
  };

  return (
    <PendingFileContext.Provider
      value={{
        pendingFilePath,
        setPendingFilePath,
        clearPendingFile,
      }}
    >
      {children}
    </PendingFileContext.Provider>
  );
};
