import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

function Navbar() {
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        console.error('Failed to parse user data');
      }
    }
  }, []);

  const isActive = (path) => {
    if (path === '/dashboard' && location.pathname === '/dashboard') return true;
    return location.pathname.startsWith(path) && path !== '/dashboard';
  };

  const linkClass = (path) => {
    const active = isActive(path);
    return `px-3 py-2 text-sm font-medium rounded-md ${
      active
        ? 'bg-blue-100 text-blue-700'
        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
    }`;
  };

  if (!user) return null;

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-4 h-12 items-center">
          <Link to="/dashboard" className={linkClass('/dashboard')}>
            Dashboard
          </Link>
          <Link to="/recipes" className={linkClass('/recipes')}>
            Recipes
          </Link>
          <Link to="/invoices" className={linkClass('/invoices')}>
            Invoices
          </Link>
          <Link to="/reporting" className={linkClass('/reporting')}>
            Reporting
          </Link>
          {(user.role === 'tenant_admin' || user.role === 'super_admin') && (
            <Link to="/admin" className={linkClass('/admin')}>
              Admin
            </Link>
          )}
          {user.role === 'super_admin' && (
            <Link to="/master-admin" className={linkClass('/master-admin')}>
              Master Admin
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
