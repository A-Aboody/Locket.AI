// frontend/src/App.jsx
import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { usePendingFile } from './contexts/PendingFileContext';
import { usePendingInvite } from './contexts/PendingInviteContext';
import ProtectedRoute from './components/ProtectedRoute';
import HeroLandingPage from './pages/HeroLandingPage';
import HomePage from './pages/HomePage';
import AllDocumentsPage from './pages/AllDocumentsPage';
import MyUploadsPage from './pages/MyUploadsPage';
import UploadPage from './pages/UploadPage';
import SettingsPage from './pages/SettingsPage';
import OrganizationSettings from './pages/OrganizationSettings';
import OrganizationOnboardingPage from './pages/OrganizationOnboardingPage';
import ChatPage from './pages/ChatPage';
import AuthPage from './pages/AuthPage';
import NotFoundPage from './pages/NotFoundPage';
import LocalFileViewer from './custom_components/LocalFileViewer';
import InviteAcceptModal from './custom_components/InviteAcceptModal';

function App() {
  const { pendingFilePath, clearPendingFile } = usePendingFile();
  const { pendingInviteCode, setPendingInviteCode, clearPendingInvite } = usePendingInvite();
  const [viewingLocalFile, setViewingLocalFile] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    // When a file is pending and user is authenticated
    if (pendingFilePath) {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');

      if (token && user) {
        try {
          const userData = JSON.parse(user);
          if (userData.email_verified) {
            // User is authenticated and verified, open the file
            console.log('[App] Opening pending file:', pendingFilePath);
            setViewingLocalFile(pendingFilePath);
            clearPendingFile();
          }
        } catch (error) {
          console.error('[App] Error parsing user data:', error);
        }
      }
      // If not authenticated, AuthPage will handle redirect
      // and we'll retry when they return
    }
  }, [pendingFilePath, clearPendingFile]);

  useEffect(() => {
    // When an invite code is pending (from deep link), show the modal
    if (pendingInviteCode) {
      console.log('[App] Opening invite modal for code:', pendingInviteCode);
      setShowInviteModal(true);
    }
  }, [pendingInviteCode]);

  useEffect(() => {
    // Check for pending invite code in sessionStorage (stored before login/signup redirect)
    const storedInviteCode = sessionStorage.getItem('pendingInviteCode');
    if (storedInviteCode && !pendingInviteCode) {
      const token = localStorage.getItem('token');
      if (token) {
        // User is now logged in, restore the invite modal
        console.log('[App] Restoring pending invite from sessionStorage:', storedInviteCode);
        setPendingInviteCode(storedInviteCode);
      }
    }
  }, [pendingInviteCode, setPendingInviteCode]);

  const handleCloseLocalFile = () => {
    setViewingLocalFile(null);
  };

  const handleCloseInviteModal = () => {
    setShowInviteModal(false);
    clearPendingInvite();
  };

  return (
    <>
      <Routes>
        <Route path="/" element={<HeroLandingPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <AllDocumentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-uploads"
          element={
            <ProtectedRoute>
              <MyUploadsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <UploadPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/:chatId"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organization-settings"
          element={
            <ProtectedRoute>
              <OrganizationSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organization-onboarding"
          element={
            <ProtectedRoute>
              <OrganizationOnboardingPage />
            </ProtectedRoute>
          }
        />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* Local File Viewer Overlay */}
      {viewingLocalFile && (
        <LocalFileViewer filePath={viewingLocalFile} onClose={handleCloseLocalFile} />
      )}

      {/* Invite Accept Modal */}
      {showInviteModal && pendingInviteCode && (
        <InviteAcceptModal
          isOpen={showInviteModal}
          onClose={handleCloseInviteModal}
          inviteCode={pendingInviteCode}
        />
      )}
    </>
  );
}

export default App;