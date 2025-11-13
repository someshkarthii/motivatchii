// frontend/src/pages/Notifications.js
import React, { useEffect, useMemo } from 'react';
import { useTasks } from '../contexts/TasksContext';
import { useNavigate } from 'react-router-dom';
import { FaBell } from 'react-icons/fa';
import frogIcon from '../assets/frog-icon.png';
import UserMenu from '../components/UserMenu';
import '../styles.css'; 


function parseDateOnly(val) {
  if (!val) return null;
  const dateStr = String(val).split('T')[0]; // Just get YYYY-MM-DD part
  return new Date(dateStr + 'T00:00:00'); // Force local timezone
}

function daysUntil(date) {
  // Parse date-only to avoid timezone-based shifts (treat deadline as calendar day)
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadline = parseDateOnly(date);
  if (!deadline) return 0;
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((deadline - today) / msPerDay);
}

function humanDueText(days) {
  if (days <= 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
}

export default function Notifications() {
  const { tasks, fetchTasks, deleteTask, markComplete } = useTasks();
  const navigate = useNavigate();
  const [communityNotifs, setCommunityNotifs] = React.useState([]);
  const RECENT_THRESHOLD = 7;

  // fetch all user notifications
  useEffect(() => {
    async function fetchCommunityNotifications() {
      try {
        const response = await fetch('http://localhost:8000/api/notifications/', {
          credentials: 'include', // send session cookie
        });
        if (!response.ok) throw new Error('Failed to fetch notifications');
        const data = await response.json();
        setCommunityNotifs(data);
      } catch (err) {
        console.error('Error fetching community notifications:', err);
      }
    }

    fetchCommunityNotifications();
  }, []);

  // filter to only display notifications up to 7 days old
  const recentCommunityNotifs = useMemo(() => {
  const now = new Date();
  return communityNotifs.filter(n => {
    const created = new Date(n.created_at);
    const diffDays = (now - created) / (1000 * 60 * 60 * 24);
    return diffDays <= RECENT_THRESHOLD;
  });
}, [communityNotifs]);

  useEffect(() => {
    // Ensure we have tasks
    fetchTasks().catch(err => console.error('Failed to fetch tasks', err));
  }, [fetchTasks]);

  const upcoming = useMemo(() => {
    if (!tasks) return [];
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(now.getDate() + 5);

    return tasks
      .filter(t => t.deadline)
      .map(t => ({ ...t, _deadlineDate: parseDateOnly(t.deadline) }))
      .filter(t => {
        // exclude completed status only; overdue tasks will be shown in Overdue section
        if (t.status === 'completed') return false;
        return t._deadlineDate && t._deadlineDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) && t._deadlineDate <= cutoff;
      })
      .sort((a, b) => a._deadlineDate - b._deadlineDate);
  }, [tasks]);

  const overdue = useMemo(() => {
    if (!tasks) return [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return tasks
      .filter(t => t.deadline)
      .map(t => ({ ...t, _deadlineDate: parseDateOnly(t.deadline) }))
      .filter(t => t._deadlineDate && t._deadlineDate < today && t.status !== 'completed')
      .sort((a, b) => a._deadlineDate - b._deadlineDate);
  }, [tasks]);

  if (!tasks) {
    return <div className="notifications-page">Loading notifications…</div>;
  }

  // unread notifications = number of upcoming tasks (no client-side read-state persisted)
  const unreadCount = Array.isArray(upcoming) ? upcoming.length : 0;

  return (
    <div className="notifications-page community-page">
      <div className="community-header">
        <div className="header-left">
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <FaBell size={45} className="community-icon" />
          </div>
          <h1>NOTIFICATIONS</h1>
          <img src={frogIcon} alt="Motivatchi Pet" className="header-pet" />
        </div>
        <div className="header-right">
          <UserMenu />
        </div>
      </div>
      <div className="notifications-split">
        <div className="notifications-left">
          {overdue.length > 0 && (
            <div>
              <h2 className="section-title">Overdue</h2>
              {overdue.map(task => (
                <div key={`ov-${task.id}`} className="notif-item" onClick={() => navigate('/tasks')} role="button" tabIndex={0}>
                  <div className="notif-left">{task.name}</div>
                  <div className="notif-right">Overdue</div>
                </div>
              ))}
            </div>
          )}

          <div>
            <h2 className="section-title">Upcoming (next 5 days)</h2>
            {upcoming.length === 0 ? (
              <div className="no-notifs">No upcoming tasks in the next 5 days</div>
            ) : (
              upcoming.map((task) => {
                const days = daysUntil(task.deadline);
                return (
                  <div key={task.id} className="notif-item" onClick={() => navigate('/tasks')} role="button" tabIndex={0}>
                    <div className="notif-left">{task.name}</div>
                    <div className="notif-right">{humanDueText(days)}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="notifications-right">
          <h3 className="section-title">Community Notifications</h3>

          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentCommunityNotifs.length === 0 ? (
              <div className="no-notifs">No community notifications</div>
            ) : (
              recentCommunityNotifs.map(n => (
                <div key={`f-${n.id}`} className="notif-item">
                  <div className="notif-left" style={{ color: '#274e2f', fontWeight: 600 }}>{n.message}</div>
                  <div className="notif-right" style={{ fontSize: 12, color: '#6b8e6b' }}>{new Date(n.created_at).toLocaleDateString()}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}