import { Routes, Route, useLocation, Link, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Recipes from './pages/Recipes';
import Invoices from './pages/Invoices';
import Reporting from './pages/Reporting';
import Admin from './pages/Admin';
import MasterAdmin from './pages/MasterAdmin';
import CogProfile from './components/CogProfile';
function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLoginPage = location.pathname === '/login';

  // Get user for menu visibility
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const handleNavClick = (path) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {!isLoginPage && (
        <>
          {/* Header with COG profile */}
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-8">
                  <Link to="/dashboard" className="text-xl font-bold text-gray-900">
                    Kitchen ERP
                  </Link>
                  
                  {/* Top Menu */}
                  {user && (
                    <nav className="hidden md:flex space-x-4">
                      <button
                        onClick={() => handleNavClick('/dashboard')}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          location.pathname === '/dashboard'
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        Dashboard
                      </button>
                      <button
                        onClick={() => handleNavClick('/recipes')}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          location.pathname === '/recipes'
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        Recipes
                      </button>
                      <button
                        onClick={() => handleNavClick('/invoices')}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          location.pathname === '/invoices'
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        Invoices
                      </button>
                      <button
                        onClick={() => handleNavClick('/reporting')}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          location.pathname === '/reporting'
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        Reporting
                      </button>
                      {(user.role === 'tenant_admin' || user.role === 'super_admin') && (
                        <button
                          onClick={() => handleNavClick('/admin')}
                          className={`px-3 py-2 text-sm font-medium rounded-md ${
                            location.pathname === '/admin'
                              ? 'bg-gray-100 text-gray-900'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                        >
                          Tenant Admin
                        </button>
                      )}
                      {user.role === 'super_admin' && (
                        <button
                          onClick={() => handleNavClick('/master-admin')}
                          className={`px-3 py-2 text-sm font-medium rounded-md ${
                            location.pathname === '/master-admin'
                              ? 'bg-gray-100 text-gray-900'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                        >
                          Master Admin
                        </button>
                      )}
                    </nav>
                  )}
                </div>
                <CogProfile />
              </div>
            </div>
          </header>
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
