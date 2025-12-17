// frontend/src/App.jsx
import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import HeroLandingPage from './pages/HeroLandingPage';
import HomePage from './pages/HomePage';
import AllDocumentsPage from './pages/AllDocumentsPage';
import MyUploadsPage from './pages/MyUploadsPage';
import UploadPage from './pages/UploadPage';
import SettingsPage from './pages/SettingsPage';
import ChatPage from './pages/ChatPage';
import AuthPage from './pages/AuthPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
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
      <Route path="/auth" element={<AuthPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;