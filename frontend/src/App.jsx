import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useStore';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import FermentersPage from './pages/FermentersPage';
import ProfilesPage from './pages/ProfilesPage';
import BatchesPage from './pages/BatchesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AlertsPage from './pages/AlertsPage';
import SettingsPage from './pages/SettingsPage';
import BatchDetailPage from './pages/BatchDetailPage';

// Protected route wrapper - DISABLED for open access
const ProtectedRoute = ({ children }) => {
  // Authentication disabled - direct access
  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Layout>
              <DashboardPage />
            </Layout>
          }
        />
        
        <Route path="/fermenters" element={<Layout><FermentersPage /></Layout>} />
        <Route path="/profiles" element={<Layout><ProfilesPage /></Layout>} />
        <Route path="/batches" element={<Layout><BatchesPage /></Layout>} />
        <Route path="/batches/:id" element={<Layout><BatchDetailPage /></Layout>} />
        <Route path="/analytics" element={<Layout><AnalyticsPage /></Layout>} />
        <Route path="/alerts" element={<Layout><AlertsPage /></Layout>} />
        <Route path="/settings" element={<Layout><SettingsPage /></Layout>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

