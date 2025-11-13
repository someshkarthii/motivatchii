import React, { createContext, useState, useContext, useEffect } from 'react';

const TasksContext = createContext(null);

export const TasksProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [errors, setErrors] = useState({});

  // helper function to log api call errors
  const apiCallError = async (errorData, message) => {
    const newErrors = {};
    newErrors.general = message + ". Please try again.";

    setErrors(prev => ({ ...prev, ...newErrors }));
    console.error(message + ":", errorData);
  }

  // helper function to log network errors
  const networkError = async (error) => {
    console.error("Network or server error:", error);
    setErrors(prev => ({
      ...prev,
      general: "An unexpected error occurred. Please try again."
    }));
  }

  // Retrieves the user's tasks from django
  const fetchTasks = async () => {
    try {
      // get tasks from backend
      const response = await fetch("http://localhost:8000/api/tasks/", {
        credentials: "include", // sends Django session cookie
      });
      const data = await response.json();

      if (!response.ok) {
        apiCallError(data, "Failed to fetch tasks");
      }

      // display tasks
      console.log("Fetched tasks:", data);
      setTasks(data);
    } catch (error) {
      networkError(error);
    }
  };

  const addTask = async (taskData) => {
    try {
      // post to django backend
      const response = await fetch("http://localhost:8000/api/tasks/", {
        credentials: "include",
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          // user_id is set by django using session cookie
          name: taskData.name,
          category: taskData.category, 
          deadline: taskData.deadline,
          priority: taskData.priority, 
          status: 'in_progress'
        })
      });

      const data = await response.json();
      if (response.ok) {
        console.log("Task created:", data);
        setTasks((prev) => [...prev, data]); // append to react tasks instead of fetching from backend for better performance
      } else {
        apiCallError(data, "Failed to create task");
      }
    } catch (error) {
      networkError(error);
    }
  };

  const updateTask = async (taskData) => {
    try {
      //change in django
      const response = await fetch(`http://localhost:8000/api/tasks/${taskData.id}/`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: taskData.name,
          priority: taskData.priority,
          deadline: taskData.deadline,
          status: taskData.status,
          category: taskData.category,
        }),
      });

      const updatedTask = await response.json();
      if (response.ok) {
        // update frontend state
        setTasks((prev) =>
          prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
        );
      } else {
        apiCallError(updatedTask, "Failed to update task");
      }
    } catch (error) {
      networkError(error);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      // delete in django
      const response = await fetch(`http://localhost:8000/api/tasks/${taskId}/`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        // update frontend state
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      } else {
        apiCallError(await response.json(), "Failed to delete task");
      }
    } catch (error) {
      networkError(error);
    }
  };

  const markComplete = async (taskId, onReward) => {
    try {
      // Use new backend endpoint for completion and rewards
      const response = await fetch(`http://localhost:8000/api/tasks/${taskId}/complete/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const rewardData = await response.json();
      if (response.ok) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: 'completed'} : t)));
        // Always return health, coins, xp, and level together
        if (onReward) onReward({
          coins: rewardData.coins,
          xp: rewardData.xp,
          level: rewardData.level,
          health: rewardData.health
        });
      } else {
        apiCallError(rewardData, "Failed to mark task as complete");
      }
    } catch (error) {
      networkError(error);
    }
  };

  const markIncomplete = async (taskId, onPenalty) => {
    try {
      // Use new backend endpoint for marking incomplete and penalties
      const response = await fetch(`http://localhost:8000/api/tasks/${taskId}/mark_incomplete/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const penaltyData = await response.json();
      if (response.ok) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: 'in_progress'} : t)));
        // Return coins, xp, level, health, remove_heart
        if (onPenalty) onPenalty({
          coins: penaltyData.coins,
          xp: penaltyData.xp,
          level: penaltyData.level,
          health: penaltyData.health,
          //remove_heart: penaltyData.remove_heart
        });
      } else {
        apiCallError(penaltyData, "Failed to mark task as incomplete");
      }
    } catch (error) {
      networkError(error);
    }
  };


  // Polling: check for overdue tasks every interval
  useEffect(() => {
    const POLL_INTERVAL = 5000; // 5 seconds

    const pollOverdueTasks = async () => {
      try {
        // fetch all tasks from backend
        const res = await fetch("http://localhost:8000/api/tasks/", {
          credentials: "include",
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Failed to fetch tasks: ${res.status} ${text}`);
        }
        const allTasks = await res.json();

        const now = new Date();

        // find tasks that are overdue but not completed/overdue yet
        const overdueTasks = allTasks.filter(task => 
          task.deadline && new Date(task.deadline) < now &&
          task.status !== "completed" && task.status !== "overdue"
        );

        await Promise.all(overdueTasks.map(async (task) => {
          try {
            // mark task overdue in backend
            const resp1 = await fetch(`http://localhost:8000/api/tasks/${task.id}/`, {
              method: "PATCH",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "overdue" }),
            });
            if (!resp1.ok) {
              const text = await resp1.text();
              throw new Error(`Failed to mark task overdue: ${resp1.status} ${text}`);
            }

            // decrease Tamagotchi health
            const resp2 = await fetch("http://localhost:8000/api/tamagotchi/health/", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "task_missed" }),
            });
            if (!resp2.ok) {
              const text = await resp2.text();
              throw new Error(`Failed to decrease health: ${resp2.status} ${text}`);
            }
          } catch (err) {
            if (err instanceof Error) {
              console.error(`Failed to process overdue task ${task.id}:`, err.message, err.stack);
            } else {
              console.error(`Failed to process overdue task ${task.id}:`, err);
            }
          }
        }));

        // update frontend state with fresh tasks
        setTasks(allTasks.map(t => 
          overdueTasks.find(ot => ot.id === t.id) ? { ...t, status: "overdue" } : t
        ));
      } catch (err) {
        if (err instanceof Error) {
          console.error("Failed to poll tasks:", err.message, err.stack);
        } else {
          console.error("Failed to poll tasks:", err);
        }
      }
    };

    const interval = setInterval(() => {
      pollOverdueTasks().catch((err) => {
        if (err instanceof Error) {
          console.error("Polling interval error:", err.message, err.stack);
        } else {
          console.error("Polling interval error:", err);
        }
      });
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Global unhandledrejection handler for dev/debug
  useEffect(() => {
    const handler = (event) => {
      console.error("[Global] Unhandled promise rejection:", event.reason);
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);


  return (
    <TasksContext.Provider value={{ tasks, errors, setTasks, fetchTasks, addTask, updateTask, deleteTask, markComplete, markIncomplete }}>
      {children}
    </TasksContext.Provider>
  );
};

export const useTasks = () => {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used within a TasksProvider');
  return ctx;
};

export default TasksContext;
