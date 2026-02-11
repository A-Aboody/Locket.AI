import { createContext, useContext, useState, useEffect } from 'react';

const PendingInviteContext = createContext();

export const usePendingInvite = () => {
  const context = useContext(PendingInviteContext);
  if (!context) {
    throw new Error('usePendingInvite must be used within PendingInviteProvider');
  }
  return context;
};

export const PendingInviteProvider = ({ children }) => {
  const [pendingInviteCode, setPendingInviteCode] = useState(null);

  useEffect(() => {
    // Only set up listener if running in Electron
    if (window.electron) {
      console.log('[PendingInvite] Setting up invite link listener');

      const handleOpenInvite = (inviteCode) => {
        console.log('[PendingInvite] Received invite code:', inviteCode);
        setPendingInviteCode(inviteCode);
      };

      window.electron.onOpenInviteLink(handleOpenInvite);

      // Request any pending invite on mount (in case invite was opened before React loaded)
      window.electron.requestPendingInvite();
    }
  }, []);

  const clearPendingInvite = () => {
    setPendingInviteCode(null);
  };

  return (
    <PendingInviteContext.Provider
      value={{
        pendingInviteCode,
        setPendingInviteCode,
        clearPendingInvite,
      }}
    >
      {children}
    </PendingInviteContext.Provider>
  );
};
