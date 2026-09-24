import { Navigate, Route, Routes } from 'react-router-dom';
import { BoothPage } from './pages/BoothPage';
import { LoginPage } from './pages/LoginPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<BoothPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
