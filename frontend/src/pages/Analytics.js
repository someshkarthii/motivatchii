import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UserMenu from '../components/UserMenu';
import InfoMenu from '../components/InfoMenu';
import { FaChartBar, FaChartLine, FaCalendarAlt, FaCheckCircle, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import frogIcon from '../assets/frog-icon.png';
import './Modal.css';

function Analytics() {
  const navigate = useNavigate();
  const [pageMode, setPageMode] = useState('weekly'); // 'weekly' or 'monthly'
  const [analyticsData, setAnalyticsData] = useState({
    completed: [],
    missed: [],
    due: [],
    trends: {
      mostProductiveCategory: '',
      mostCompletedDay: '',
      totalCompleted: 0,
      completionRate: 0
    }
  });

  // Helper function to format dates
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  };

  // TEMPORARY STATIC DATA - Replace with backend data
  // Different data sets for weekly vs monthly view
  const getStaticDataForMode = (mode) => {
    if (mode === 'weekly') {
      return {
        completed: [
          { id: 1, name: 'Complete Project Report', category: 'Academic', completedDate: '2025-11-05', priority: 'High' }
        ],
        missed: [
          { id: 2, name: 'Doctor Appointment', category: 'Health', dueDate: '2025-11-02', priority: 'High' }
        ],
        due: [
          { id: 3, name: 'Team Meeting Prep', category: 'Work', dueDate: '2025-11-10', priority: 'Medium' }
        ],
        trends: {
          mostProductiveCategory: 'Academic',
          mostCompletedDay: 'November 5, 2025',
          totalCompleted: 1,
          completionRate: 75.0
        }
      };
    } else { // monthly
      return {
        completed: [
          { id: 1, name: 'Complete Project Report', category: 'Academic', completedDate: '2025-11-05', priority: 'High' },
          { id: 4, name: 'Finish Coding Assignment', category: 'Academic', completedDate: '2025-10-28', priority: 'Medium' },
          { id: 5, name: 'Grocery Shopping', category: 'Personal', completedDate: '2025-10-25', priority: 'Low' }
        ],
        missed: [
          { id: 2, name: 'Doctor Appointment', category: 'Health', dueDate: '2025-11-02', priority: 'High' },
          { id: 6, name: 'Library Book Return', category: 'Personal', dueDate: '2025-10-20', priority: 'Low' }
        ],
        due: [
          { id: 3, name: 'Team Meeting Prep', category: 'Work', dueDate: '2025-11-10', priority: 'Medium' },
          { id: 7, name: 'Monthly Report', category: 'Work', dueDate: '2025-11-30', priority: 'High' },
          { id: 8, name: 'Dentist Appointment', category: 'Health', dueDate: '2025-11-25', priority: 'Medium' }
        ],
        trends: {
          mostProductiveCategory: 'Academic',
          mostCompletedDay: 'November 5, 2025',
          totalCompleted: 3,
          completionRate: 60.0
        }
      };
    }
  };

  useEffect(() => {
    fetchAnalyticsData(pageMode);
  }, [pageMode]);

  const fetchAnalyticsData = async (mode) => {
    try {
      const res = await fetch(`https://backend-purple-field-5089.fly.dev/api/tasks/analytics/?period=${mode}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch analytics data");
      }
      const data = await res.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    }
  };

  // Handle page mode changes (Weekly/Monthly view)
  const handleModeChange = (newMode) => {
    setPageMode(newMode);
  };

  const renderTaskPanel = (tasks, title, icon, panelType) => (
    <div className={`analytics-panel ${panelType}`}>
      <div className="panel-header">
        {icon}
        <h3>{title}</h3>
        <span className="task-count">{tasks.length}</span>
      </div>
      <div className="analytics-task-list">
        {tasks.length > 0 ? (
          tasks.map(task => (
            <div key={task.id} className="analytics-task-item">
              <div className="analytics-task-info">
                <div className="analytics-task-name">{task.name}</div>
                <div className="analytics-task-due">{formatDate(task.completedDate || task.dueDate)}</div>
                <div className={`analytics-task-priority ${task.priority?.toLowerCase()}`}>{task.priority}</div>
              </div>
              <button className="analytics-task-action" onClick={() => navigate('/tasks')}>View</button>
            </div>
          ))
        ) : (
          <div className="analytics-no-tasks">
            <p>No {title.toLowerCase()} tasks</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="analytics-page">
      {/* Header */}
      <div className="analytics-header">
        <div className="analytics-header-left">
          <FaChartBar size={45} className="analytics-icon" />
          <h1>ANALYTICS</h1>
          <img src={frogIcon} alt="Motivatchi Pet" className="analytics-header-pet" />
        </div>
        <div className="header-right">
          <InfoMenu />
          <UserMenu />
        </div>
      </div>

      {/* Time Frame Selector - Controls Page Mode */}
      <div className="timeframe-selector">
        <button 
          className={`timeframe-btn ${pageMode === 'weekly' ? 'active' : ''}`}
          onClick={() => handleModeChange('weekly')}
        >
          <FaCalendarAlt /> Weekly Overview
        </button>
        <button 
          className={`timeframe-btn ${pageMode === 'monthly' ? 'active' : ''}`}
          onClick={() => handleModeChange('monthly')}
        >
          <FaCalendarAlt /> Monthly Overview
        </button>
      </div>

      {/* Main Analytics Content */}
      <div className="analytics-content">
        {/* Task Status Panels */}
        <div className="task-panels">
          {renderTaskPanel(
            analyticsData.completed,
            'Completed Tasks',
            <FaCheckCircle className="panel-icon completed" />,
            'completed-panel'
          )}
          
          {renderTaskPanel(
            analyticsData.missed,
            'Missed Tasks',
            <FaExclamationTriangle className="panel-icon missed" />,
            'missed-panel'
          )}
          
          {renderTaskPanel(
            analyticsData.due,
            'Upcoming Tasks',
            <FaClock className="panel-icon due" />,
            'due-panel'
          )}
        </div>

        {/* Trends Section */}
        <div className="trends-section">
          <div className="trends-header">
            <FaChartLine className="trends-icon" />
            <h2>Productivity Trends</h2>
            <span className="trends-period">
              {pageMode === 'weekly' ? 'This Week' : 'This Month'}
            </span>
          </div>
          
          <div className="trends-grid">
            <div className="trend-card">
              <div className="trend-label">Most Productive Category</div>
              <div className="trend-value">
                {analyticsData.trends.mostProductiveCategory}
              </div>
            </div>
            
            <div className="trend-card">
              <div className="trend-label">Most Completed Date</div>
              <div className="trend-value">
                {analyticsData.trends.mostCompletedDay}
              </div>
            </div>
            
            <div className="trend-card">
              <div className="trend-label">Total Completed</div>
              <div className="trend-value completion-rate">
                {analyticsData.trends.totalCompleted}
              </div>
            </div>
            
            <div className="trend-card">
              <div className="trend-label">Completion Rate</div>
              <div className="trend-value completion-rate">
                {analyticsData.trends.completionRate}%
              </div>
              <div className="completion-bar">
                <div 
                  className="completion-progress"
                  style={{ width: `${analyticsData.trends.completionRate}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;