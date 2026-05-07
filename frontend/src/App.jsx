import { useState, useEffect } from 'react';
import { Routes, Route, useLocation, Link, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Recipes from './pages/Recipes';
import RecipeCsvImport from './pages/RecipeCsvImport';
import Invoices from './pages/Invoices';
import InvoiceNew from './pages/InvoiceNew';
import InvoiceView from './pages/InvoiceView';
import InvoiceEdit from './pages/InvoiceEdit';
import RecipeMappings from './pages/RecipeMappings';
import FixedCosts from './pages/FixedCosts';
import Reporting from './pages/Reporting';
import Admin from './pages/Admin';
import SuperAdmin from './pages/SuperAdmin';
import Profile from './pages/Profile';
import CogProfile from './components/CogProfile';
import TenantSelector from './components/TenantSelector';
import ErrorBoundary from './components/ErrorBoundary';
function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLoginPage = location.pathname === '/login';

  // Get user for menu visibility
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  // Track current template
  const [currentTemplate, setCurrentTemplate] = useState(() => {
    return localStorage.getItem('selectedTemplate') || 'modern';
  });

  // Apply saved template on load
  useEffect(() => {
    const savedTemplate = localStorage.getItem('selectedTemplate') || 'modern';
    document.body.classList.remove('template-modern', 'template-red-grey');
    document.body.classList.add(`template-${savedTemplate}`);
    setCurrentTemplate(savedTemplate);
  }, []);

  // Listen for template changes from other components (e.g., Profile page)
  useEffect(() => {
    const handleTemplateChange = (event) => {
      const newTemplate = event.detail.template;
      document.body.classList.remove('template-modern', 'template-red-grey');
      document.body.classList.add(`template-${newTemplate}`);
      setCurrentTemplate(newTemplate);
    };

    window.addEventListener('templateChanged', handleTemplateChange);
    return () => window.removeEventListener('templateChanged', handleTemplateChange);
  }, []);

  const handleNavClick = (path) => {
    navigate(path);
  };

  return (
    <div className={`min-h-screen ${currentTemplate === 'red-grey' ? 'bg-gray-100' : 'bg-gray-50'}`}>
      {!isLoginPage && (
        <>
          {/* Header with COG profile */}
          <header className={`${currentTemplate === 'red-grey' ? 'bg-red-600 border-red-700' : 'bg-white border-gray-200'} shadow-sm border-b`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-8">
                  <Link to="/dashboard" className={`text-xl font-bold ${currentTemplate === 'red-grey' ? 'text-white' : 'text-gray-900'}`}>
                    Kitchen ERP
                  </Link>
                  
                  {/* Top Menu */}
                  {user && (
                    <nav className="hidden md:flex space-x-4">
                      <button
                        onClick={() => handleNavClick('/dashboard')}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          location.pathname === '/dashboard'
                            ? (currentTemplate === 'red-grey' ? 'bg-red-700 text-white' : 'bg-gray-100 text-gray-900')
                            : (currentTemplate === 'red-grey' ? 'text-red-100 hover:text-white hover:bg-red-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50')
                        }`}
                      >
                        Dashboard
                      </button>
                      <button
                        onClick={() => handleNavClick('/recipes')}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          location.pathname === '/recipes'
                            ? (currentTemplate === 'red-grey' ? 'bg-red-700 text-white' : 'bg-gray-100 text-gray-900')
                            : (currentTemplate === 'red-grey' ? 'text-red-100 hover:text-white hover:bg-red-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50')
                        }`}
                      >
                        Recipes
                      </button>
                      <button
                        onClick={() => handleNavClick('/invoices')}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          location.pathname.startsWith('/invoices')
                            ? (currentTemplate === 'red-grey' ? 'bg-red-700 text-white' : 'bg-gray-100 text-gray-900')
                            : (currentTemplate === 'red-grey' ? 'text-red-100 hover:text-white hover:bg-red-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50')
                        }`}
                      >
                        Invoices
                      </button>
                      <button
                        onClick={() => handleNavClick('/fixed-costs')}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          location.pathname === '/fixed-costs'
                            ? (currentTemplate === 'red-grey' ? 'bg-red-700 text-white' : 'bg-gray-100 text-gray-900')
                            : (currentTemplate === 'red-grey' ? 'text-red-100 hover:text-white hover:bg-red-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50')
                        }`}
                      >
                        Fixed Costs
                      </button>
                      <button
                        onClick={() => handleNavClick('/reporting')}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          location.pathname === '/reporting'
                            ? (currentTemplate === 'red-grey' ? 'bg-red-700 text-white' : 'bg-gray-100 text-gray-900')
                            : (currentTemplate === 'red-grey' ? 'text-red-100 hover:text-white hover:bg-red-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50')
                        }`}
                      >
                        Reporting
                      </button>
                      {(user.role === 'tenant_admin' || user.role === 'super_admin') && (
                        <>
                          {/* Tenant Admin button - visible to super_admin and tenant_admin */}
                          <button
                            onClick={() => handleNavClick(user.role === 'super_admin' ? '/super-admin' : '/admin')}
                            className={`px-3 py-2 text-sm font-medium rounded-md ${
                              location.pathname === '/admin' || location.pathname === '/super-admin'
                                ? (currentTemplate === 'red-grey' ? 'bg-red-700 text-white' : 'bg-gray-100 text-gray-900')
                                : (currentTemplate === 'red-grey' ? 'text-red-100 hover:text-white hover:bg-red-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50')
                            }`}
                          >
                            {user.role === 'super_admin' ? 'Tenant Admin' : 'Admin'}
                          </button>
                          
                          {/* Admin button - only visible to super_admin */}
                          {user.role === 'super_admin' && (
                            <button
                              onClick={() => handleNavClick('/admin')}
                              className={`px-3 py-2 text-sm font-medium rounded-md ${
                                location.pathname === '/admin'
                                  ? (currentTemplate === 'red-grey' ? 'bg-red-700 text-white' : 'bg-gray-100 text-gray-900')
                                  : (currentTemplate === 'red-grey' ? 'text-red-100 hover:text-white hover:bg-red-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50')
                              }`}
                            >
                              Admin
                            </button>
                          )}
                        </>
                      )}
                    </nav>
                  )}
                </div>
                <div className="flex items-center space-x-4">
                  <TenantSelector />
                  <CogProfile currentTemplate={currentTemplate} />
                </div>
              </div>
            </div>
          </header>
        </>
      )}

      {/* Main Content */}
      <main className={isLoginPage ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'}>
        <ErrorBoundary>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/recipe-csv-import" element={<RecipeCsvImport />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/new" element={<InvoiceNew />} />
            <Route path="/invoices/:id" element={<InvoiceView />} />
            <Route path="/invoices/:id/edit" element={<InvoiceEdit />} />
            <Route path="/fixed-costs" element={<FixedCosts />} />
            <Route path="/reporting" element={<Reporting />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/super-admin" element={<SuperAdmin />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/" element={<Login />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default App;
