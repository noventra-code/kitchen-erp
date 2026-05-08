import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function CogProfile({ currentTemplate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [currentRole, setCurrentRole] = useState('');
  const [selectedTenantName, setSelectedTenantName] = useState('');
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Load user from localStorage
    const userStr = localStorage.getItem('user');
    const membershipsStr = localStorage.getItem('memberships');
    const selectedTenantId = localStorage.getItem('selectedTenantId');
    
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        console.error('Failed to parse user data');
      }
    }

    // Compute current role from memberships
    if (membershipsStr && selectedTenantId) {
      try {
        const memberships = JSON.parse(membershipsStr);
        const membership = memberships.find(m => 
          m.tenant_id.toString() === selectedTenantId.toString()
        );
        if (membership) {
          setCurrentRole(membership.role);
          setSelectedTenantName(membership.tenant_name || '');
        } else {
          // User has memberships but not for selected tenant (e.g., SuperAdmin)
          const isSuperAdmin = memberships.some(m => m.role === 'SuperAdmin');
          if (isSuperAdmin) {
            setCurrentRole('SuperAdmin');
          }
        }
      } catch (e) {
        console.error('Failed to parse memberships');
      }
    }
    
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('memberships');
    localStorage.removeItem('selectedTenantId');
    localStorage.removeItem('selectedTenantName');
    setIsOpen(false);
    navigate('/login');
  };

  const handleNavigation = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 ${currentTemplate === 'red-grey' ? 'text-red-100 hover:text-white' : 'text-gray-600 hover:text-gray-900'} focus:outline-none`}
        aria-label="User menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 min-w-48 w-fit bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
          {/* User Info */}
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">{user.first_name} {user.last_name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
            {selectedTenantName && (
              <p className="text-xs text-gray-400 mt-1">{selectedTenantName}</p>
            )}
            {currentRole && (
              <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded ${
                currentRole === 'SuperAdmin' 
                  ? 'bg-purple-100 text-purple-800' 
                  : currentRole === 'TenantAdmin'
                  ? 'bg-blue-100 text-blue-800'
                  : currentRole === 'Editor'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {currentRole}
              </span>
            )}
          </div>

          {/* Profile Link - visible to all users */}
          {user && (
            <button
              onClick={() => handleNavigation('/profile')}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <svg className="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile
            </button>
          )}

          {/* User Profiles Link (SuperAdmin only) */}
          {currentRole === 'SuperAdmin' && (
            <button
              onClick={() => handleNavigation('/profiles')}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <svg className="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              User Profiles
            </button>
          )}



          {/* Logout */}
          <div className="border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <svg className="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CogProfile;
