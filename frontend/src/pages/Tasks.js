import React, { useState, useEffect, useRef } from 'react';
import { FaClipboardList, FaPlus, FaEllipsisV } from 'react-icons/fa';
import frogIcon from '../assets/frog-icon.png';
import TaskModal from "./TaskModal";
import { useTasks } from '../contexts/TasksContext';
import UserMenu from '../components/UserMenu';

const Tasks = () => {
  // tasks come from shared TasksContext
  const { tasks, fetchTasks, addTask, updateTask, deleteTask, markComplete, markIncomplete } = useTasks();
  const [priorityFilter, setPriorityFilter] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showDeadlineDropdown, setShowDeadlineDropdown] = useState(false);
  const [deadlineSort, setDeadlineSort] = useState(null); // 'closest' or 'farthest'
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const [confirmDeleteTaskId, setConfirmDeleteTaskId] = useState(null);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState();

  const deadlineOptions = [
    { label: 'All', value: null },
    { label: 'Next 7 days', value: 'next7' },
    { label: 'Next 30 days', value: 'next30' },
    { label: 'Past Due', value: 'pastdue' }
  ];

  // Load user's tasks upon opening page
  useEffect(() => {
    fetchTasks();
  }, []);

  const handleDeadlineClick = () => {
    setShowDeadlineDropdown(!showDeadlineDropdown);
  };
  const handleCategoryClick = () => {
    setShowCategoryDropdown(!showCategoryDropdown);
  };

  // Handle scrolling with the custom scrollbar
  React.useEffect(() => {
    const tableBody = document.querySelector('.table-body');
    const content = document.querySelector('.tasks-content');

    if (tableBody && content) {
      const onScroll = () => {
        const scrollPercentage = tableBody.scrollTop / (tableBody.scrollHeight - tableBody.clientHeight || 1);
        const thumbPosition = scrollPercentage * (content.clientHeight - 80);
        content.style.setProperty('--thumb-position', `${thumbPosition}px`);
      };

      tableBody.addEventListener('scroll', onScroll);
      // set initial
      onScroll();

      return () => {
        tableBody.removeEventListener('scroll', onScroll);
      };
    }
  }, []);

  // close action menu on outside click
  useEffect(() => {
    function handleDocClick(e) {
      if (!e.target.closest('.row-action-button') && !e.target.closest('.row-actions-menu')) {
        setOpenActionMenuId(null);
      }
    }
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, []);

  // Priority options
  const priorityOptions = ['High', 'Medium', 'Low'];
  // Category options derived from tasks (unique, non-empty)
  const getCategoryOptions = () => {
    const categories = new Set();
    for (const task of tasks) {
      const cat = (task.category || '').trim();
      if (cat) {
        categories.add(cat);
      }
    }
    return Array.from(categories);
  };
  const categoryOptions = getCategoryOptions();

  const handlePriorityClick = () => {
    setShowPriorityDropdown(!showPriorityDropdown);
  };

  const handleAddTask = () => {
    setModalMode("create");
    setIsModalOpen(true);
  };

  // For edit logic
  const handleEditTask = (taskData) => {
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleSaveTask = (taskData) => {
    addTask(taskData);
    setIsModalOpen(false);
  };

  const priorityValue = (p) => {
    if (!p) return 0;
    if (p.toLowerCase() === 'high') return 3;
    if (p.toLowerCase() === 'medium') return 2;
    return 1;
  };

  const applyFiltersAndSort = () => {
    const now = new Date();
    const filtered = tasks.filter((t) => {
      if (priorityFilter && t.priority.toLowerCase() !== priorityFilter) return false;
      if (categoryFilter && (t.category || '').trim().toLowerCase() !== categoryFilter) return false;
      if (deadlineSort) {
        const d = new Date(t.deadline);
        const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
        if (deadlineSort === 'next7' && diffDays > 7) return false;
        if (deadlineSort === 'next30' && (diffDays > 30 || diffDays < 0)) return false;
        if (deadlineSort === 'pastdue' && diffDays >= 0) return false;
      }
      return true;
    });

    // sort: incomplete first by priority(desc) then deadline(asc), then completed at bottom
    const sorted = filtered.sort((a, b) => {
      const isACompleted = a.status === 'completed';
      const isBCompleted = b.status === 'completed';

      // Completed tasks go to the bottom
      if (isACompleted !== isBCompleted) return isACompleted ? 1 : -1;

      // For incomplete tasks (in_progress or overdue)
      if (!isACompleted) {
        const pa = priorityValue(a.priority);
        const pb = priorityValue(b.priority);

        // Higher priority first
        if (pa !== pb) return pb - pa;

        // Earlier deadline first
        return new Date(a.deadline) - new Date(b.deadline);
      }

      // Completed tasks: keep original order
      return 0;
    });

    return sorted;
  };

  const displayedTasks = applyFiltersAndSort();

  const toggleActionMenu = (taskId) => {
    setOpenActionMenuId((prev) => (prev === taskId ? null : taskId));
  };

  const confirmDelete = (taskId) => {
    setConfirmDeleteTaskId(taskId);
    setIsConfirmVisible(true);
    setOpenActionMenuId(null);
  };

  const doDelete = () => {
    deleteTask(confirmDeleteTaskId);
    setIsConfirmVisible(false);
    setConfirmDeleteTaskId(null);
  };

  const cancelDelete = () => {
    setIsConfirmVisible(false);
    setConfirmDeleteTaskId(null);
  };

  // markComplete/Incomplete use context functions
  const handleMarkComplete = (taskId) => {
    markComplete(taskId);
    setOpenActionMenuId(null);
  };

  const handleMarkIncomplete = (taskId) => {
    markIncomplete(taskId);
    setOpenActionMenuId(null);
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setModalMode('edit');
    setIsModalOpen(true);
    setOpenActionMenuId(null);
  };

  const handleSaveEdit = (taskData) => {
    updateTask(taskData);
    setIsModalOpen(false);
    setEditingTask(null);
  };

  return (
    <div className="tasks-page">
      {/* Header */}
      <div className="tasks-header">
        <div className="header-left">
          <FaClipboardList size={45} className="tasks-icon" />
          <h1>TASKS</h1>
          <img src={frogIcon} alt="Motivatchi Pet" className="header-pet" />
        </div>
        <div className="header-right">
          <UserMenu />
        </div>
      </div>

      {/* Main Content */}
      <div className="tasks-content">
        <div className="task-table">
          {/* Table Header */}
          <div className="table-header">
            <div className="header-cell">Name</div>
            <div className="header-cell category-cell" onClick={handleCategoryClick}>
              Category ▼
              {showCategoryDropdown && (
                <div className="priority-dropdown"> 
                  <div className="priority-title">Category</div>
                  {categoryOptions.length === 0 ? (
                    <div className="priority-option" style={{ opacity: 0.8 }}>No categories yet</div>
                  ) : (
                    categoryOptions.map((c) => (
                      <label key={c} className="priority-option">
                        <input
                          type="checkbox"
                          checked={categoryFilter === c.toLowerCase()}
                          onChange={() => setCategoryFilter(prev => prev === c.toLowerCase() ? null : c.toLowerCase())}
                        />
                        {c}
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="header-cell priority-cell" onClick={handlePriorityClick}>
              Priority ▼
              {showPriorityDropdown && (
                <div className="priority-dropdown">
                  <div className="priority-title">Priority</div>
                  {priorityOptions.map((priority) => (
                    <label key={priority} className="priority-option">
                      <input
                        type="checkbox"
                        checked={priorityFilter === priority.toLowerCase()}
                        onChange={() => setPriorityFilter(prev => prev === priority.toLowerCase() ? null : priority.toLowerCase())}
                      />
                      {priority}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="header-cell deadline-cell" onClick={handleDeadlineClick}>
              Deadline ▼
              {showDeadlineDropdown && (
                <div className="priority-dropdown"> {/* reuse same styling */}
                  <div className="priority-title">Deadline</div>
                  {deadlineOptions.map((option) => (
                    <label key={option.label} className="priority-option">
                      <input
                        type="checkbox"
                        checked={deadlineSort === option.value}
                        onChange={() => setDeadlineSort(prev => prev === option.value ? null : option.value)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="header-cell actions">{/* actions spacer */}</div>
          </div>

          {/* Table Body */}
          <div className="table-body">
            {displayedTasks.map((task) => (
              <div key={task.id} className={`table-row ${task.status === 'completed' ? 'completed' : ''}`}>
                <div className="table-cell">{task.name}</div>
                <div className="table-cell">{task.category || ''}</div>
                <div className="table-cell">{task.priority}</div>
                <div className="table-cell">{task.deadline}</div>
                <div className="table-cell actions">
                  <button
                    className="row-action-button"
                    aria-label={`Actions for ${task.name}`}
                    onClick={(e) => { e.stopPropagation(); toggleActionMenu(task.id); }}
                  >
                    <FaEllipsisV />
                  </button>

                  {openActionMenuId === task.id && (
                    <div className="row-actions-menu">
                      {task.status !== 'completed' ? (
                        <>
                          <button className="row-actions-item" onClick={() => handleEdit(task)}>Modify</button>
                          <button className="row-actions-item" onClick={() => handleMarkComplete(task.id)}>Mark as Complete</button>
                          <button className="row-actions-item destructive" onClick={() => confirmDelete(task.id)}>Delete</button>
                        </>
                      ) : (
                        <>
                          <button className="row-actions-item" onClick={() => handleMarkIncomplete(task.id)}>Mark as Incomplete</button>
                          <button className="row-actions-item destructive" onClick={() => confirmDelete(task.id)}>Delete</button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {/* Spacer to keep scroll area even when empty */}
            {displayedTasks.length === 0 && <div style={{height: '300px'}}></div>}
          </div>
        </div>

        {/* Add Task Button */}
        <button className="add-task-button" onClick={handleAddTask} aria-label="Add Task">
          <FaPlus />
        </button>
        <TaskModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
          mode={modalMode}
          task={editingTask}
          existingTasks={tasks}
          onSave={(data) => {
            if (modalMode === 'edit') handleSaveEdit(data);
            else handleSaveTask(data);
          }}
        />

        {/* Confirm delete modal */}
        {isConfirmVisible && (
          <div className="confirm-modal-backdrop">
            <div className="confirm-modal">
              <p>Are you sure you want to delete this task?</p>
              <div style={{display: 'flex', gap: '1rem', marginTop: '1rem'}}>
                <button className="primary-button" onClick={doDelete}>Yes</button>
                <button className="primary-button" style={{background: '#fff', color: '#5a6d2c'}} onClick={cancelDelete}>No</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tasks;