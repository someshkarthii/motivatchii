import { useState, useEffect } from "react";
import Modal from "react-modal";
import DatePicker from "react-datepicker";
import Select from "react-select";
import "react-datepicker/dist/react-datepicker.css";
import "./TaskModal.css";

const TaskModal = ({ isOpen, onClose, mode, onSave, task, existingTasks }) => {

  const [name, setName] = useState(null);
  const [priority, setPriority] = useState(null);
  const [category, setCategory] = useState(null);
  const [deadline, setDeadline] = useState(null);
  
  // Validation error messages
  const [nameError, setNameError] = useState(null);
  const [priorityError, setPriorityError] = useState(null);
  const [deadlineError, setDeadlineError] = useState(null);

  const priorityOptions = [
    { value: "High", label: "High" },
    { value: "Medium", label: "Medium" },
    { value: "Low", label: "Low" },
  ];

  const handleClose = () => {
    // Reset form fields when closing
    setName(null);
    setPriority(null);
    setCategory(null);
    setDeadline(null);
    setNameError(null);
    setPriorityError(null);
    setDeadlineError(null);
    onClose();
  };

  // Prefill fields when editing
  useEffect(() => {
    if (isOpen && mode === 'edit' && task) {
      setName(task.name || '');
      if (task.priority) setPriority({ value: task.priority, label: task.priority });
      setCategory(task.category || '');
      // parse stored YYYY-MM-DD into a local date object (avoid timezone shift)
      if (task.deadline) {
        const parts = String(task.deadline).split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const d = parseInt(parts[2], 10);
          setDeadline(new Date(y, m, d));
        } else {
          setDeadline(new Date(task.deadline));
        }
      }
      setNameError(null);
      setPriorityError(null);
      setDeadlineError(null);
    }
  }, [isOpen, mode, task]);

  const handleSubmit = (event) => {
    event.preventDefault();

    // Check modal fields and validate
    const nameError = !name || !name.trim() ? "Name is required" : "";
    const priorityError = !priority ? "Priority is required" : "";
    const deadlineError = !deadline ? "Deadline is required" : "";
    setNameError(nameError);
    setPriorityError(priorityError);
    setDeadlineError(deadlineError);
    if (nameError || priorityError || deadlineError) {
      return; 
    }
    
    // Check for unique name
    const trimmedName = name.trim();
    const incompleteTasks = (existingTasks || []).filter(t => t.status === 'in_progress' || t.status === 'overdue');    
    const isNameTaken = incompleteTasks.some(t => 
      t.name.toLowerCase() === trimmedName.toLowerCase() && (!task || t.id !== task.id)
    );

    if (isNameTaken) {
      setNameError("A task with this name already exists");
      return;
    }

    // Group task data to store
    // Build YYYY-MM-DD from local date parts to avoid timezone conversions
    const pad = (n) => String(n).padStart(2, '0');
    const y = deadline.getFullYear();
    const m = pad(deadline.getMonth() + 1);
    const d = pad(deadline.getDate());
    const isoLocal = `${y}-${m}-${d}`;

    const taskData = { 
      id: task?.id,
      name: name.trim(), 
      priority: priority.value, 
      category: category ? category.trim() : "",
      deadline: isoLocal,
    };
    onSave(taskData);
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleClose}
      overlayClassName="task-modal-overlay"
      className="task-modal-content"
    >
        {/* Header */}
        <div className="task-modal-header">
          <h2 className="task-modal-title">
            {mode === "edit" ? "EDIT TASK" : "CREATE TASK"}
          </h2>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="task-modal-close"
          >
            ×
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit}>
        
        {/* Name Field */}
          <label className="task-modal-label">Name</label>
          <input
            type="text"
            value={name ?? ""}
            onChange={(NameEvent) => {
              setName(NameEvent.target.value);
              if (nameError) setNameError("");
            }}
            onBlur={() => setNameError(!name?.trim() ? "Name is required" : "")}
            placeholder="Task name"
            className={`task-input ${nameError ? 'is-error' : ''}`}
          />
          {nameError && <div className="task-error">{nameError}</div>}
        
        {/* Category Field (optional, no validation) */}
          <label className="task-modal-label">Category</label>
          <input
            type="text"
            value={category ?? ""}
            onChange={(CategoryEvent) => {
              setCategory(CategoryEvent.target.value);
            }}
            placeholder="Category"
            className="task-input"
          />
        
        {/* Priority Field */}
          <label className="task-modal-label">Priority</label>
          <Select
            value={priority}
            onChange={(PriorityEvent) => {
              setPriority(PriorityEvent);
              if (priorityError) setPriorityError("");
            }}
            options={priorityOptions}
            placeholder="Priority of Task"
            className={`task-select ${priorityError ? 'is-error' : ''}`}
            classNamePrefix="task-select"
          />
          {priorityError && <div className="task-error">{priorityError}</div>}

        {/* Deadline Field */}
          <label className="task-modal-label">Deadline</label>
          <DatePicker
            selected={deadline}
            onChange={(DeadlineEvent) => {
              setDeadline(DeadlineEvent);
              if (deadlineError) setDeadlineError("");
            }}
            dateFormat="MM/dd/yyyy"
            placeholderText="Select deadline"
            customInput={<input className={`task-input task-input-date ${deadlineError ? 'is-error' : ''}`} />}
          />
          {deadlineError && <div className="task-error">{deadlineError}</div>}
        
        {/* Create/Edit Tasks */}
          <div className="task-modal-footer">
            <button type="submit" className="task-button task-button-primary">
              {mode === "edit" ? "SAVE CHANGES" : "CREATE"}
            </button>
          </div>
        </form>
      </Modal>
    );
  };
  
export default TaskModal;