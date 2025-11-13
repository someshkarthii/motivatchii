
import React from 'react';

import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import Dashboard from '../pages/Dashboard';
import Tasks from '../pages/Tasks';
import Notifications from '../pages/Notifications';
import Analytics from '../pages/Analytics';

import Community from '../pages/Community';
import Sidebar from './Sidebar';
import './Sidebar.css';
import '../styles.css';
import { TasksProvider } from '../contexts/TasksContext';

function App() {
  return (
    <Router>
      {/* mm */}
         <Main />
    </Router>
  );
}

function Main() {
  const location = useLocation();
  // Hide the sidebar on auth pages
  const hideSidebarPaths = ['/', '/signup'];
  const hideSidebar = hideSidebarPaths.includes(location.pathname);

  return (
    // mm
      <div className="App">
        <TasksProvider>
         {/* <Sidebar /> */}
         {!hideSidebar && <Sidebar />}
          <Routes>
            {<Route path="/" element={<Login />} />}
            <Route path="/signup" element={<Signup />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/community" element={<Community />} />
            <Route path="/notifications" element={<Notifications />} />
          </Routes>
        </TasksProvider>
      </div>
    // </Router>
  );
}

export default App;