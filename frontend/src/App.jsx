import { Routes, Route, useLocation, Link } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Recipes from './pages/Recipes';
import Invoices from './pages/Invoices';
import Reporting from './pages/Reporting';
import Admin from './pages/Admin';
import MasterAdmin from './pages/MasterAdmin';
import Breadcrumbs from './components/Breadcrumbs';
import CogProfile from './components/CogProfile';

function App() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div className="min-h-screen bg-gray-50">
      {!isLoginPage && (
        <>
          {/* Header with COG profile */}
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <Link to="/dashboard" className="text-xl font-bold text-gray-900">
                  Kitchen ERP
                </Link>
                <CogProfile />
              </div>
            </div>
          </header>

          {/* Breadcrumbs */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Breadcrumbs />
          </div>
        </>
      )}

      {/* Main Content */}
      <main className={isLoginPage ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/recipes" element={<Recipes />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/reporting" element={<Reporting />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/master-admin" element={<MasterAdmin />} />
          <Route path="/" element={<Login />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
