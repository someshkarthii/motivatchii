import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = () => {
  return (
    <div className="sidebar">
      <div className="sidebar-content">
        <NavLink to="/tasks" className="sidebar-item">
          <div className="sidebar-icon">📋</div>
        </NavLink>
        <NavLink to="/pet" className="sidebar-item">
          <div className="sidebar-icon">🐣</div>
        </NavLink>
        <NavLink to="/stats" className="sidebar-item">
          <div className="sidebar-icon">📈</div>
        </NavLink>
        <NavLink to="/settings" className="sidebar-item">
          <div className="sidebar-icon">⚙️</div>
        </NavLink>
        <NavLink to="/community" className="sidebar-item">
          <div className="sidebar-icon">👥</div>
        </NavLink>
      </div>
    </div>
  );
};

export default Sidebar;