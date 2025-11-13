import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';  

const DefaultUserIcon = () => (
  <svg
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    fill="currentColor"
    width="1em"
    height="1em"
  >
    {/* head */}
    <circle cx="12" cy="8" r="4" />
    {/* shoulders/base */}
    <path d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6v1H4v-1z" />
  </svg>
);

const UserMenu = ({ icon, label = 'Logout', onLogout }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate(); 

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogoutClick = async () => {
    try {
      const response = await fetch('https://motivatchi-backend.onrender.com/api/logout/', {
        method: 'POST',
        credentials: 'include', 
      });

      if (response.ok) {
        console.log('Logout successful');
        if (onLogout) onLogout(); 
        navigate('/'); 
      } else {
        console.error('Logout failed with status:', response.status);
        alert('Logout failed. Please try again.');
      }
    } catch (error) {
      console.error('Logout error:', error);
      alert('An unexpected error occurred during logout.');
    }

    setOpen(false);
  };

  return (
    <div className="user-menu-container" ref={ref}>
      <button
        className="user-menu-button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title="User menu"
      >
        <span className="user-menu-icon" aria-hidden>
          {icon ? icon : <DefaultUserIcon />}
        </span>
      </button>

      {open && (
        <div role="menu" className="user-menu-dropdown">
          <button
            role="menuitem"
            className="user-menu-item"
            onClick={handleLogoutClick} 
          >
            {label}
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
