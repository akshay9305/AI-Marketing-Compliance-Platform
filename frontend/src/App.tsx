import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Homepage from './pages/Homepage';
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import Templates from './pages/Templates';
import Playground from './pages/Playground';
import TemplateUpload from './pages/TemplateUpload';
import SocialMedia from './pages/SocialMedia';
import Compliance from './pages/Compliance';
import Analytics from './pages/Analytics';
import DevDashboard from './pages/dev/Dashboard';
import DevTemplateMigration from './pages/dev/TemplateMigration';
import DevCompliance from './pages/dev/Compliance';
import DevValidation from './pages/dev/Validation';
import DevSettings from './pages/dev/Settings';

function App() {
  return (
    <Router>
      <Routes>
  {/* Public routes */}
  <Route path="/" element={<Homepage />} />
  <Route path="/login" element={<LoginPage />} />
        
        {/* Protected routes with layout */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/templates" element={
          <ProtectedRoute>
            <Layout>
              <Templates />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/template-upload" element={
          <ProtectedRoute>
            <Layout>
              <TemplateUpload />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/playground/:id" element={
          <ProtectedRoute>
            <Layout>
              <Playground />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/social-media" element={
          <ProtectedRoute>
            <Layout>
              <SocialMedia />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/compliance" element={
          <ProtectedRoute>
            <Layout>
              <Compliance />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute>
            <Layout>
              <Analytics />
            </Layout>
          </ProtectedRoute>
        } />
        {/* Developer routes (shown when user_role is Developer via Sidebar) */}
        <Route path="/dev/dashboard" element={
          <ProtectedRoute>
            <Layout>
              <DevDashboard />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/dev/templates" element={
          <ProtectedRoute>
            <Layout>
              <DevSettings />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/dev/migration" element={
          <ProtectedRoute>
            <Layout>
              <DevTemplateMigration />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/dev/compliance" element={
          <ProtectedRoute>
            <Layout>
              <DevCompliance />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/dev/validation" element={
          <ProtectedRoute>
            <Layout>
              <DevValidation />
            </Layout>
          </ProtectedRoute>
        } />

        {/* Settings route (keep original path for business users) */}
        <Route path="/settings" element={
          <ProtectedRoute>
            <Layout>
              <DevSettings />
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;