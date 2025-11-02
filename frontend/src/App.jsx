import { Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AllDocumentsPage from './pages/AllDocumentsPage';
import MyUploadsPage from './pages/MyUploadsPage';
import UploadPage from './pages/UploadPage';
import AuthPage from './pages/AuthPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/documents" element={<AllDocumentsPage />} />
      <Route path="/my-uploads" element={<MyUploadsPage />} />
      <Route path="/upload" element={<UploadPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;