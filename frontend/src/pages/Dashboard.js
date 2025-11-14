import React, { useState, useEffect, useRef } from 'react';
import { useTasks } from '../contexts/TasksContext';
import { useNavigate } from 'react-router-dom';
import frogIcon from '../assets/frog-icon.png';
import frogIconSad from '../assets/frog-icon-sad.png';
import eggIcon from '../assets/egg-icon.png';
import heartIcon from '../assets/heart.png';
import coinIcon from '../assets/coin-icon.png';
import UserMenu from '../components/UserMenu';
import InfoMenu from '../components/InfoMenu';
import HealthBar from '../components/HealthBar';

// Outfit images
import bubbleFrog from '../assets/frog-outfits/bubble_frog.png';
import computerFrog from '../assets/frog-outfits/computer_frog.png';
import chickenFrog from '../assets/frog-outfits/chicken_frog.png';
import appleFrog from '../assets/frog-outfits/apple_frog.png';
import pumpkinFrog from '../assets/frog-outfits/pumpkin_frog.png';
import astronautFrog from '../assets/frog-outfits/astronaut_frog.png';
import knifeFrog from '../assets/frog-outfits/knife_frog.png';
import strawberryFrog from '../assets/frog-outfits/strawberry_frog.png';

// Dead images (now actively used)
import bubbleFrogSad from '../assets/frog-outfits-sad/bubble_frog_sad.png';
import computerFrogSad from '../assets/frog-outfits-sad/computer_frog_sad.png';
import chickenFrogSad from '../assets/frog-outfits-sad/chicken_frog_sad.png';
import appleFrogSad from '../assets/frog-outfits-sad/apple_frog_sad.png';
import pumpkinFrogSad from '../assets/frog-outfits-sad/pumpkin_frog_sad.png';
import astronautFrogSad from '../assets/frog-outfits-sad/astronaut_frog_sad.png';
import knifeFrogSad from '../assets/frog-outfits-sad/knife_frog_sad.png';
import strawberryFrogSad from '../assets/frog-outfits-sad/strawberry_frog_sad.png';

function Dashboard() {
  const navigate = useNavigate();
  const { tasks, fetchTasks, markComplete, markIncomplete } = useTasks();
  const healthBarRef = useRef();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks');
  const [selectedOutfit, setSelectedOutfit] = useState('default');
  const [userCoins, setUserCoins] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [userXP, setUserXP] = useState(0);
  const [userHealth, setUserHealth] = useState(null);

  // map outfit # → key used in outfitsList
  const outfitKeyById = {
    1: 'default',
    2: 'bubble',
    3: 'computer',
    4: 'chicken',
    5: 'apple',
    6: 'pumpkin',
    7: 'astronaut',
    8: 'knife',
    9: 'strawberry'
  };
  // reverse map key → outfit #
  const outfitIdByKey = Object.fromEntries(
    Object.entries(outfitKeyById).map(([k, v]) => [v, Number(k)])
  );

  // Shop data lives here; unlocked toggles set after /api/me
  const [outfitsList, setOutfitsList] = useState([
    { id: 'default',    name: 'Default',    image: frogIcon,       unlocked: true,  price: 0    },
    { id: 'bubble',     name: 'Bubble',     image: bubbleFrog,     unlocked: false, price: 50   },
    { id: 'computer',   name: 'Computer',   image: computerFrog,   unlocked: false, price: 100  },
    { id: 'chicken',    name: 'Chicken',    image: chickenFrog,    unlocked: false, price: 500  },
    { id: 'apple',      name: 'Apple',      image: appleFrog,      unlocked: false, price: 1000 },
    { id: 'pumpkin',    name: 'Pumpkin',    image: pumpkinFrog,    unlocked: false, price: 5000 },
    { id: 'astronaut',  name: 'Astronaut',  image: astronautFrog,  unlocked: false, price: 10000},
    { id: 'knife',      name: 'Knife',      image: knifeFrog,      unlocked: false, price: 20000},
    { id: 'strawberry', name: 'Strawberry', image: strawberryFrog, unlocked: false, price: 50000}
  ]);

  const sadOutfitImages = {
    default: frogIconSad,
    bubble: bubbleFrogSad,
    computer: computerFrogSad,
    chicken: chickenFrogSad,
    apple: appleFrogSad,
    pumpkin: pumpkinFrogSad,
    astronaut: astronautFrogSad,
    knife: knifeFrogSad,
    strawberry: strawberryFrogSad,
  };

  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [outfitToBuy, setOutfitToBuy] = useState(null);

  // Verify login + pull user+tamagotchi
  useEffect(() => {
    const checkLogin = async () => {
      try {
        const res = await fetch("https://backend-purple-field-5089.fly.dev/api/me/", {
          credentials: "include",
        });
        if (!res.ok) {
          navigate("/");
          return;
        }
        const data = await res.json();
        setUser(data);
        setUserCoins(data.coins);
        setUserLevel(data.level ?? 1);
        setUserXP(data.xp ?? 0);
        setUserHealth(data.health); 

        //Mark unlocked outfits from backend
        const unlocked = new Set(data.unlocked_outfits || [1]);
        setOutfitsList(prev =>
          prev.map(o => ({
            ...o,
            unlocked: o.id === 'default' ? true : unlocked.has(outfitIdByKey[o.id])
          }))
        );

        //Select currently equipped outfit from backend
        const currentKey = outfitKeyById[data.outfit || 1] || 'default';
        setSelectedOutfit(currentKey);
      } catch (e) {
        console.error(e);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    checkLogin();
  }, [navigate]);

  // Fetch tasks for the dashboard
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Poll for health every second to reactively update death/revive state
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("https://backend-purple-field-5089.fly.dev/api/tamagotchi/health/", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setUserHealth(data.health);
        }
      } catch (err) {
        console.error("Health polling failed:", err);
      }
    }, 1000); 

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="dashboard"><p>Loading...</p></div>;
  }

  // ----- Outfit interactions -----

  // Equip (only if unlocked) → persist via backend
  const handleOutfitClick = async (outfitKey) => {
    const outfit = outfitsList.find(o => o.id === outfitKey);
    if (!outfit?.unlocked) return;

    try {
      const res = await fetch("https://backend-purple-field-5089.fly.dev/api/tamagotchi/set-outfit/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ outfit_id: outfitIdByKey[outfitKey] }) 
      });
      if (res.ok) {
        setSelectedOutfit(outfitKey); 
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.error || "Failed to set outfit");
        setShowErrorDialog(true);
      }
    } catch (e) {
      setErrorMessage("Network error setting outfit");
      setShowErrorDialog(true);
    }
  };

  // Start a purchase (UI confirm)
  const handleBuyClick = (e, outfit) => {
    e.stopPropagation();

    // If user doesn't have enough coins, show Oops error immediately
    if ((userCoins ?? 0) < (outfit.price ?? 0)) {
      setErrorMessage("Oops! You don't have enough coins to buy this outfit.");
      setShowErrorDialog(true);
      return;
    }

    // user has enough coins -> proceed with confirmation dialog
    setOutfitToBuy(outfit);
    setShowConfirmDialog(true);
  };

  // Confirm purchase → call backend, update local coins + unlocks
  const handleConfirmPurchase = async () => {
    if (!outfitToBuy) return;

    try {
      const res = await fetch("https://backend-purple-field-5089.fly.dev/api/tamagotchi/purchase-outfit/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ outfit_id: outfitIdByKey[outfitToBuy.id] }) 
      });

      const out = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(out.error || "Purchase failed");
        setShowErrorDialog(true);
      } else {
        setUserCoins(out.coins ?? userCoins);
        const unlocked = new Set(out.unlocked_outfits || []);
        setOutfitsList(prev =>
          prev.map(o => ({
            ...o,
            unlocked: o.id === 'default' ? true : unlocked.has(outfitIdByKey[o.id])
          }))
        );
      }
    } catch (e) {
      setErrorMessage("Network error purchasing outfit");
      setShowErrorDialog(true);
    } finally {
      setShowConfirmDialog(false);
      setOutfitToBuy(null);
    }
  };

  // ----- Tasks block -----
  const upcomingTasks = Array.isArray(tasks)
    ? [...tasks].sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 6)
    : [];

  const formatDueDate = (deadline) => {
    if (!deadline) return 'No due date';
    const today = new Date();
    const dueDate = new Date(deadline);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays <= 7) return `${diffDays} days`;
    return dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleMarkComplete = (taskId) => {
    markComplete(taskId, (rewardData) => {
      if (typeof rewardData === 'object') {
        setUserCoins(rewardData.coins ?? userCoins);
        setUserLevel(rewardData.level ?? userLevel);
        setUserXP(rewardData.xp ?? userXP);
        setUserHealth(rewardData.health ?? userHealth); // 🆕 this will trigger re-render if health increases
      }
      if (healthBarRef.current?.refreshHealth) healthBarRef.current.refreshHealth();
    });
  };

  const handleMarkIncomplete = (taskId) => {
    markIncomplete(taskId, (penaltyData) => {
      if (typeof penaltyData === 'object') {
        setUserCoins(penaltyData.coins ?? userCoins);
        setUserLevel(penaltyData.level ?? userLevel);
        setUserXP(penaltyData.xp ?? userXP);
        setUserHealth(penaltyData.health ?? userHealth); 
      }
      if (healthBarRef.current?.refreshHealth) healthBarRef.current.refreshHealth();
    });
  };

  return (
    <div className="dashboard">
      <div className="main-content">
        {/* Top Bar */}
        <div className="top-bar">
          <div className="user-info">
            <div className="name-field">{user?.username}</div>
          </div>
          <div className="stats">
            <div className="coins">
              <img src={coinIcon} alt="Coin" className="coin" />
              <span>{userCoins}</span>
            </div>
            <div className="level">
              <span>LVL {userLevel}</span>
              <div className="level-bar">
                <div
                  className="level-progress"
                  style={{ width: `${Math.min(100, (userXP / 100) * 100)}%` }}
                ></div>
              </div>
              <span style={{ fontSize: '0.8em', marginLeft: 8 }}>{userXP}/100 XP</span>
            </div>
            <div className="profile-icon" style={{ background: 'transparent', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <InfoMenu />
              <UserMenu />
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="dashboard-content">
          {/* Pet Display */}
          <div className="pet-section">
            <div className="hearts">
              <HealthBar ref={healthBarRef} health={userHealth ?? 0} />
            </div>
            <div className="pet-container">
              <div
                className="pet-screen"
                style={{
                  backgroundImage: `url(${eggIcon})`,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center'
                }}
              >
                <img
                  src={
                    userHealth <= 0
                      ? sadOutfitImages[selectedOutfit] || frogIconSad
                      : (outfitsList.find(o => o.id === selectedOutfit)?.image) || frogIcon
                  }
                  alt="Motivatchi Pet"
                  className="pet-image"
                />
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="right-panel">
            <div className="tab-navigation">
              <button className={`tab ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>TASKS</button>
              <button className={`tab ${activeTab === 'outfits' ? 'active' : ''}`} onClick={() => setActiveTab('outfits')}>OUTFITS</button>
            </div>

            {activeTab === 'tasks' ? (
              <div className="tasks-section">
                <div className="task-list">
                  {Array.isArray(tasks) && tasks.length === 0 ? (
                    <div className="no-tasks">
                      <p>
                        You haven't created any tasks yet. Head to your{' '}
                        <button 
                          className="primary-button" 
                          onClick={() => navigate('/tasks')}
                          style={{ 
                            display: 'inline-block',
                            width: 'auto',
                            padding: '8px 16px',
                            fontSize: '0.9rem',
                            margin: '0 4px',
                            verticalAlign: 'middle',
                            background: '#4d5d29',
                            color: 'white'
                          }}
                        >
                          Tasks
                        </button>
                        {' '}page to get started!
                      </p>
                    </div>
                  ) : (
                    upcomingTasks.map(task => (
                      <div key={task.id} className={`task-item ${task.status === 'completed' ? 'completed' : ''}`}>
                        <input
                          type="checkbox"
                          checked={task.status === 'completed'}
                          onChange={(e) => e.target.checked ? handleMarkComplete(task.id) : handleMarkIncomplete(task.id)}
                        />
                        <div className="task-info">
                          <div className="task-name">{task.name}</div>
                          <div className="task-due">{formatDueDate(task.deadline)}</div>
                          <div className={`task-priority ${task.priority?.toLowerCase()}`}>{task.priority}</div>
                        </div>
                        <button className="task-action" onClick={() => navigate('/tasks')}>View</button>
                      </div>
                    ))
                  )}
                </div>
                {upcomingTasks.length > 0 && <button className="scroll-down">v</button>}
              </div>
            ) : (
              <div className="outfits-section">
                <div className="outfit-grid">
                  {outfitsList.map((outfit) => (
                    <div
                      key={outfit.id}
                      className={`outfit-item ${selectedOutfit === outfit.id ? 'selected' : ''} ${!outfit.unlocked ? 'locked' : ''}`}
                      onClick={() => handleOutfitClick(outfit.id)}
                    >
                      <img src={outfit.image} alt={outfit.name} className="outfit-image" />
                      {!outfit.unlocked && (
                        <div className="outfit-locked-overlay">
                          <div className="outfit-price">
                            <img src={coinIcon} alt="Coins" />
                            <span>{outfit.price}</span>
                          </div>
                          <button className="buy-button" onClick={(e) => handleBuyClick(e, outfit)}>BUY</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Purchase Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="dialog-overlay">
          <div className="confirmation-dialog">
            <h3>Confirm Purchase</h3>
            <p>Do you want to buy the {outfitToBuy?.name} outfit for {outfitToBuy?.price} coins?</p>
            <div className="dialog-buttons">
              <button onClick={() => setShowConfirmDialog(false)}>Cancel</button>
              <button onClick={handleConfirmPurchase}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Error Dialog */}
      {showErrorDialog && (
        <div className="dialog-overlay">
          <div className="confirmation-dialog error-dialog">
            <h3>Oops!</h3>
            <p>{errorMessage}</p>
            <div className="dialog-buttons">
              <button onClick={() => setShowErrorDialog(false)}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;