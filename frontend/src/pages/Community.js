import { useState, useEffect } from 'react';
import Modal from 'react-modal';
import frogIcon from '../assets/frog-icon.png';
// Friend avatar/outfit icons
import bubbleFrog from '../assets/frog-outfits/bubble_frog.png';
import computerFrog from '../assets/frog-outfits/computer_frog.png';
import chickenFrog from '../assets/frog-outfits/chicken_frog.png';
import appleFrog from '../assets/frog-outfits/apple_frog.png';
import pumpkinFrog from '../assets/frog-outfits/pumpkin_frog.png';
import astronautFrog from '../assets/frog-outfits/astronaut_frog.png';
import knifeFrog from '../assets/frog-outfits/knife_frog.png';
import strawberryFrog from '../assets/frog-outfits/strawberry_frog.png';
import bubbleFrogSad from '../assets/frog-outfits-sad/bubble_frog_sad.png';
import computerFrogSad from '../assets/frog-outfits-sad/computer_frog_sad.png';
import chickenFrogSad from '../assets/frog-outfits-sad/chicken_frog_sad.png';
import appleFrogSad from '../assets/frog-outfits-sad/apple_frog_sad.png';
import pumpkinFrogSad from '../assets/frog-outfits-sad/pumpkin_frog_sad.png';
import astronautFrogSad from '../assets/frog-outfits-sad/astronaut_frog_sad.png';
import knifeFrogSad from '../assets/frog-outfits-sad/knife_frog_sad.png';
import strawberryFrogSad from '../assets/frog-outfits-sad/strawberry_frog_sad.png';
import frogIconSad from '../assets/frog-icon-sad.png';
import heartIcon from '../assets/heart.png';
import coinIcon from '../assets/coin-icon.png';
import UserMenu from '../components/UserMenu';
import InfoMenu from '../components/InfoMenu';
import { FaUsers } from 'react-icons/fa';
import './Modal.css';
import '../styles.css';

function Community() {
  const [activeTab, setActiveTab] = useState('following');
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [selectedFollowing, setSelectedFollowing] = useState(null);
  const [hasJoinedChallenge, setHasJoinedChallenge] = useState(false);
  const [weeklyChallenge, setWeeklyChallenge] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [challengeProgress, setChallengeProgress] = useState({ completed: 0, total: 0 });

  const [globalEvent, setGlobalEvent] = useState(null); // event info
  const [leaderboard, setLeaderboard] = useState([]); // top 3
  const [noSeasonalEventsActive, setNoSeasonalEventsActive] = useState(true);
  const currentUsername = "You";
  const [currentUserRank, setCurrentUserRank] = useState(null);
  const [currentUserCompleted, setCurrentUserCompleted] = useState(null);
  

  const outfitImages = {
    default: frogIcon,
    bubble: bubbleFrog,
    computer: computerFrog,
    chicken: chickenFrog,
    apple: appleFrog,
    pumpkin: pumpkinFrog,
    astronaut: astronautFrog,
    knife: knifeFrog,
    strawberry: strawberryFrog,
  };
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

// Handle follow from team members panel
  const handleFollow = async (username) => {
    try {
      const response = await fetch("https://backend-purple-field-5089.fly.dev/api/follow/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username }),
      });
      const data = await response.json();
      if (response.ok) {
        setFollowing((prev) => [...prev, { username }]);
        alert(`You are now following ${username}.`);
      } else {
        alert(data.error || data.detail || "Unable to follow this user.");
      }
    } catch (err) {
      console.error("Error following user:", err);
      alert("Something went wrong. Please try again.");
    }
  };


  useEffect(() => {
    // initialize user following and followers list
    const fetchConnections = async () => {
      try {
        const response = await fetch("https://backend-purple-field-5089.fly.dev/api/connections/", {
          credentials: "include", // include session cookie for authentication
        });

        if (response.ok) {
          const data = await response.json();
          setFollowing((data.following || []).map(username => ({ username }))); // convert to objects as expected by frontend code
          setFollowers((data.followers || []).map(username => ({ username })));
        } else {
          console.error("Failed to fetch user connections");
        }
      } catch (error) {
        console.error("Error fetching connections:", error);
      }
    };

    fetchConnections();

    // Fetch the weekly challenge from backend
    const fetchWeeklyChallenge = async () => {
      try {
        const response = await fetch("https://backend-purple-field-5089.fly.dev/api/challenges/weekly/", {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          // Transform backend response to match frontend format
          const challengeObject = {
            taskCount: data.task_count,
            priority: data.priority,
            description: data.description,
            start: data.start_date,
            deadline: data.deadline
          };
          setWeeklyChallenge(challengeObject);
        } else {
          console.error("Failed to fetch weekly challenge");
        }
      } catch (error) {
        console.error("Error fetching weekly challenge:", error);
      }
    };

    fetchWeeklyChallenge();

    // Check if user has already joined the challenge
    const checkChallengeStatus = async () => {
      try {
        const response = await fetch("https://backend-purple-field-5089.fly.dev/api/challenges/status/", {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setHasJoinedChallenge(data.has_joined);
          
          // If user has joined, fetch team members and progress
          if (data.has_joined) {
            fetchTeamMembers();
            fetchTeamProgress();
          }
        }
      } catch (error) {
        console.error("Error checking challenge status:", error);
      }
    };

    checkChallengeStatus();

    const fetchGlobalEvent = async () => {
      try {

        // Get leaderboard for current event -> must happen before current event call in case an event just ended
        const resLeaderboard = await fetch("https://backend-purple-field-5089.fly.dev/api/events/leaderboard/", {
          credentials: "include"
        });
        const dataLeaderboard = await resLeaderboard.json();

        if (resLeaderboard.status === 404 || dataLeaderboard.detail === "No active event") {
          setGlobalEvent(null);
          setLeaderboard([]);
          setCurrentUserRank(null);
          setNoSeasonalEventsActive(true);
          return;
        }

        if (dataLeaderboard.detail === "Event has ended") {
          setGlobalEvent(null);
          setLeaderboard([]);
          setCurrentUserRank(null);
          setNoSeasonalEventsActive(true);
          return;
        }

        setNoSeasonalEventsActive(false);

        // Get current event
        const resEvent = await fetch("https://backend-purple-field-5089.fly.dev/api/events/current/", {
          credentials: "include"
        });
        const dataEvent = await resEvent.json();

        if (!dataEvent) {
          setGlobalEvent(null);
          return;
        }
        setGlobalEvent(dataEvent);

        setLeaderboard(dataLeaderboard.leaderboard || []);
        setCurrentUserRank(dataLeaderboard.your_rank);
        setCurrentUserCompleted(dataLeaderboard.your_completed_tasks);

      } catch (err) {
        console.error("Failed to fetch global event data:", err);
      }
    };

    fetchGlobalEvent();
  }, []);

  // Fetch team members for the current challenge
  const fetchTeamMembers = async () => {
    try {
      const response = await fetch("https://backend-purple-field-5089.fly.dev/api/challenges/team-members/", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.team_members || []);
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
    }
  };

  // Fetch team progress for the current challenge
  const fetchTeamProgress = async () => {
    try {
      const response = await fetch("https://backend-purple-field-5089.fly.dev/api/challenges/team-progress/", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setChallengeProgress({
          completed: data.completed,
          total: data.total
        });
        // If reward was earned, show notification or update UI
        if (data.reward_earned > 0) {
          console.log(`Congratulations! You earned ${data.reward_earned} coins!`);
        }
      }
    } catch (error) {
      console.error("Error fetching team progress:", error);
    }
  };

  const handleJoinChallenge = async () => {
    try {
      const response = await fetch("https://backend-purple-field-5089.fly.dev/api/challenges/join/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (response.ok) {
        setHasJoinedChallenge(true);
        
        // Fetch team members (friends who have joined the challenge)
        await fetchTeamMembers();
        
        // Fetch team progress
        await fetchTeamProgress();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to join challenge");
      }
    } catch (error) {
      console.error("Error joining challenge:", error);
      alert("Something went wrong. Please try again.");
    }
  };

  const handleAddFriend = async (usernameParam) => {
    // use username if provided, else use form submission
    const username = usernameParam || newUsername.trim();
    if (!username) {
      alert("Please enter a username.");
      return;
    }

    try {
      const response = await fetch("https://backend-purple-field-5089.fly.dev/api/follow/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username: username }),
      });

      const data = await response.json();
      if (response.ok) {
        setFollowing((prev) => [...prev, { username: username }]);
        if (!usernameParam) setNewUsername(""); // only clear input if from form
        setShowAddModal(false); // only close modal if from form
      } else {
        alert(data.error || data.detail || "Unable to follow this user.");
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Something went wrong. Please try again.");
    }
  };

  const handleUnfollow = async (username) => {
    try {
      const response = await fetch("https://backend-purple-field-5089.fly.dev/api/unfollow/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username }),
      });

      const data = await response.json();

      if (response.ok) {
        setFollowing(prev => prev.filter(f => f.username !== username));
        if (selectedFollowing?.username === username) {
          setSelectedFollowing(null);
        }
      } else {
        alert(data.error || data.detail || "Unable to unfollow user.");
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Something went wrong. Please try again.");
    }
  };

  const handleRemoveFollower = async (username) => {
    try {
      const response = await fetch("https://backend-purple-field-5089.fly.dev/api/remove-follower/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update frontend state
        setFollowers((prev) => prev.filter(f => f.username !== username));
      } else {
        alert(data.error || data.detail || "Failed to remove follower.");
      }
    } catch (err) {
      console.error("Error removing follower:", err);
      alert("Something went wrong. Please try again.");
    }
  };

  const handleFollowingClick = async (user) => {
    const isFollowing = following.some(f => f.username === user.username);
    if (!isFollowing) {
      alert("You are not following this user.");
      setSelectedFollowing(null);
      return;
    }

    try {
      const [tamaRes, coinsRes] = await Promise.all([
        fetch(`https://backend-purple-field-5089.fly.dev/api/following/${user.username}/tamagotchi/`, {
          credentials: "include",
        }),
        fetch(`https://backend-purple-field-5089.fly.dev/api/following/${user.username}/coins/`, {
          credentials: "include",
        })
      ]);

      const tamaData = tamaRes.ok ? await tamaRes.json() : null;
      const coinData = coinsRes.ok ? await coinsRes.json() : null;

      if (tamaData && coinData) {
        // Map outfit number (1–9) → string key
        const outfitKeyById = {
          1: "default",
          2: "bubble",
          3: "computer",
          4: "chicken",
          5: "apple",
          6: "pumpkin",
          7: "astronaut",
          8: "knife",
          9: "strawberry",
        };

        const outfitKey = outfitKeyById[tamaData.outfit_id] || "default";

        setSelectedFollowing({
          ...tamaData,
          coins: coinData.coins,
          image: outfitImages[outfitKey] || frogIcon,
        });
      } else {
        setSelectedFollowing(null);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setNewUsername('');
  };

  const renderHearts = (heartCount) => {
    const hearts = [];
    for (let i = 0; i < heartCount; i++) {
      hearts.push(<img key={i} src={heartIcon} alt="Heart" className="heart" />);
    }
    return hearts;
  };

  return (
    <div className="community-page">
      {/* Header */}
      <div className="community-header">
        <div className="header-left">
          <FaUsers size={45} className="community-icon" />
          <h1>COMMUNITY</h1>
          <img src={frogIcon} alt="Motivatchi Pet" className="header-pet" />
        </div>
        <div className="header-right">
          <InfoMenu />
          <UserMenu />
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Main Content */}
        <div className="community-content">
          {/* Pet Display and it shows following info or default message */}
          <div className="following-section">
            {selectedFollowing ? (
              <>
                {/* Compact Top Bar for Following */}
                <div className="following-top-bar">
                  <div className="user-info">
                    <div className="name-field">{selectedFollowing.username}</div>
                  </div>
                  <div className="stats">
                    <div className="coins">
                      <img src={coinIcon} alt="Coin" className="coin" />
                      <span>{selectedFollowing.coins}</span>
                    </div>
                    <div className="level">
                      <span>LVL {selectedFollowing.level}</span>
                      <div className="level-bar">
                        <div className="level-progress"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="hearts">
                  {renderHearts(selectedFollowing.hearts)}
                </div>
                <div className="pet-container">
                  <div className="pet-screen">
                    <img
                      src={
                        selectedFollowing.hearts <= 0
                          ? sadOutfitImages[
                              Object.keys(outfitImages).find(
                                key => outfitImages[key] === selectedFollowing.image
                              ) || 'default'
                            ] || frogIconSad
                          : selectedFollowing.image
                      }
                      alt={`${selectedFollowing.username}'s pet`}
                      className="pet-image"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="pet-container">
                <div className="pet-screen community-default-message">
                  <p>
                    Click the <span className="add-button-icon">+</span> to add your friends and check out their motivatchi
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="community-right-panel">
            {/* Following and Followers tab Navigation */}
            <div className="community-tab-navigation">
              <button 
                className={`community-tab ${activeTab === 'following' ? 'active' : ''}`}
                onClick={() => setActiveTab('following')}
              >
                FOLLOWING
              </button>
              <button 
                className={`community-tab ${activeTab === 'followers' ? 'active' : ''}`}
                onClick={() => setActiveTab('followers')}
              >
                FOLLOWERS
              </button>
            </div>

            {/* Add Follower Button */}
            <button className="community-add-follower-btn" onClick={() => setShowAddModal(true)}>
              +
            </button>

{activeTab === 'following' ? (
            <div className="community-following-section">
              <div className="community-following-list">
              {following.length > 0 && (
                following.map((friend, index) => (
                  <div 
                    key={index} 
                    className="community-following-item"
                  >
                    <div 
                      className="community-following-info"
                      onClick={() => handleFollowingClick(friend)}
                    >
                      <div className="community-following-name">{friend.username}</div>
                      <div className="community-action-buttons">
                        <button 
                          className="community-unfollow-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnfollow(friend.username);
                          }}
                        >
                          UNFOLLOW
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
              </div>
            </div>
          ) : (
            <div className="community-following-section">
              <div className="community-following-list">
              {followers.length > 0 && (
                followers.map((follower, index) => (
                  <div 
                    key={index} 
                    className="community-following-item"
                  >
                    <div 
                      className="community-following-info"
                      onClick={() => handleFollowingClick(follower)}
                    >
                      <div className="community-following-name">{follower.username}</div>
                      <div className="community-action-buttons">
                        {!following.some(f => f.username === follower.username) && (
                          <button 
                            className="community-follow-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddFriend(follower.username)
                            }}
                          >
                            FOLLOW
                          </button>
                        )}
                        <button 
                          className="community-remove-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFollower(follower.username);
                          }}
                        >
                          REMOVE
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Community Challenges Section */}
      <div className="community-challenges-section">
        <div className="task-panels">
          <div className="trends-header" style={{gridColumn: '1 / -1', marginBottom: 0}}>
            <FaUsers className="trends-icon" />
            <h2 className="trends-title">Community Challenges</h2>
            <span className="trends-period">This Week</span>
          </div>
          {/* Challenge Panel */}
          <div className="analytics-panel challenge-panel">
            <div className="panel-header">
              <FaUsers className="panel-icon" style={{ color: '#4d5d29' }} />
              <h3>Weekly Challenge</h3>
            </div>
            <div className="challenge-content">
              {weeklyChallenge && (
                <>
                  <div className="challenge-description">
                    {weeklyChallenge.description}
                  </div>
                  <div className="challenge-details">
                    <div className="challenge-detail-item">
                      <span className="detail-label">Target:</span>
                      <span className="detail-value">{weeklyChallenge.taskCount} tasks</span>
                    </div>
                    <div className="challenge-detail-item">
                      <span className="detail-label">Priority:</span>
                      <span className={`detail-value priority-badge ${weeklyChallenge.priority.toLowerCase()}`}>
                        {weeklyChallenge.priority}
                      </span>
                    </div>
                    <div className="challenge-detail-item">
                      <span className="detail-label">Reward:</span>
                      <span className="detail-value coins-reward">
                        <img src={coinIcon} alt="Coin" className="reward-coin-icon" />
                        20 each
                      </span>
                    </div>
                    <div className="challenge-detail-item">
                      <span className="detail-label">Deadline:</span>
                      <span className="detail-value" style={{ fontSize: '12px', marginLeft: '8px' }}>
                        {weeklyChallenge.deadline ? new Date(weeklyChallenge.deadline).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                      </span>
                    </div>
                    
                  </div>
                  {!hasJoinedChallenge ? (
                    <button className="join-challenge-btn" onClick={handleJoinChallenge}>
                      JOIN CHALLENGE
                    </button>
                  ) : (
                    <div className="joined-badge">✓ Joined</div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Team Members Panel */}
          <div className="analytics-panel team-panel">
            <div className="panel-header">
              <FaUsers className="panel-icon" style={{ color: '#4d5d29' }} />
              <h3>Team Members</h3>
              <span className="task-count">{teamMembers.length}</span>
            </div>
            <div className="team-members-list">
              {hasJoinedChallenge && teamMembers.length > 0 ? (
                teamMembers.map((member, index) => (
                  <div key={index} className="team-member-item">
                    <div className="team-member-name">{member.username}</div>
                    {member.username !== window.currentUsername && !following.some(f => f.username === member.username) && (
                      <button
                        className="community-follow-button"
                        style={{ background: '#4d5d29', color: 'white' }}
                        onClick={() => handleFollow(member.username)}
                      >
                        Follow
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="analytics-no-tasks">
                  <p>{hasJoinedChallenge ? 'No team members yet' : 'Join the challenge to see team members'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Progress Panel */}
          <div className="analytics-panel progress-panel">
            <div className="panel-header">
              <FaUsers className="panel-icon" style={{ color: '#4d5d29' }} />
              <h3>Team Progress</h3>
            </div>
            <div className="progress-content">
              {hasJoinedChallenge ? (
                <>
                  <div className="progress-stats">
                    <div className="progress-stat-item">
                      <span className="stat-label">Completed</span>
                      <span className="stat-value">{challengeProgress.completed}</span>
                    </div>
                    <div className="progress-stat-item">
                      <span className="stat-label">Target</span>
                      <span className="stat-value">{challengeProgress.total}</span>
                    </div>
                  </div>
                  <div className="completion-bar-container">
                    <div className="completion-percentage">
                      {Math.round((challengeProgress.completed / challengeProgress.total) * 100)}%
                    </div>
                    <div className="completion-bar">
                      <div 
                        className="completion-progress"
                        style={{ 
                          width: `${Math.min((challengeProgress.completed / challengeProgress.total) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  {challengeProgress.completed >= challengeProgress.total && (
                    <div className="challenge-completed-message">
                      🎉 Weekly challenge completed!
                    </div>
                  )}
                </>
              ) : (
                <div className="analytics-no-tasks">
                  <p>Join the challenge to track progress</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Global Challenges Section */}
      <div className="global-challenges-section" style={{ width: '100%', margin: '32px auto 0 auto', maxWidth: '1200px' }}>
          <div className="task-panels" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start', width: '100%', paddingLeft: '1px', paddingRight: '12px' }}>
          <div className="trends-header" style={{gridColumn: '1 / -1', marginBottom: 0}}>
            <FaUsers className="trends-icon" />
            <h2 className="trends-title">Global Challenges</h2>
            <span className="trends-period">Seasonal Events</span>
          </div>
          {/* Challenge Panel - show global challenge if available, else seasonal event */}
          <div className="analytics-panel challenge-panel" style={{ minHeight: '340px', height: '100%' }}>
            <div className="panel-header">
              <FaUsers className="panel-icon" style={{ color: '#4d5d29' }} />
              <h3>{noSeasonalEventsActive ? 'No Seasonal Event' : (globalEvent?.name)}</h3>
            </div>
            <div className="challenge-content">
              {noSeasonalEventsActive ? (
                <div className="analytics-no-tasks">
                  <p>There are no current seasonal events. Please check back later.</p>
                </div>
              ) : (
                <>
                  <div className="challenge-description">Complete as many tasks</div>
                  <div className="challenge-details">
                    <div className="challenge-detail-item">
                      <span className="detail-label">Reward:</span>
                      <span className="detail-value coins-reward">
                        <img src={coinIcon} alt="Coin" className="reward-coin-icon" />
                        {globalEvent?.reward_coins ?? 0}
                      </span>
                    </div>
                    <div className="challenge-detail-item">
                      <span className="detail-label">Start:</span>
                      <span className="detail-value">{globalEvent?.start ? new Date(globalEvent.start).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</span>
                    </div>
                    <div className="challenge-detail-item">
                      <span className="detail-label">End:</span>
                      <span className="detail-value">{globalEvent?.end ? new Date(globalEvent.end).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          {/* Leaderboard Panel */}
          <div className="analytics-panel team-panel" style={{ minHeight: '340px', height: '100%' }}>
            <div className="panel-header">
              <FaUsers className="panel-icon" style={{ color: '#4d5d29' }} />
              <h3>Leaderboard</h3>
              <span className="task-count">{noSeasonalEventsActive ? 0 : (currentUserRank > 3 ? 4 : Math.min(3, leaderboard.length))}</span>
            </div>
            <div className="team-members-list">
              {noSeasonalEventsActive ? (
                <div className="analytics-no-tasks">
                  <p>There are no current seasonal events. Please check back later.</p>
                </div>
              ) : (
                <>
                  {/* Top 3 users with numbered ranking and medal icons */}
                  {leaderboard.slice(0, 3).map((user, idx) => (
                    <div key={user.username} className="team-member-item">
                      <div className="team-member-name">
                        #{idx + 1} {user.username === currentUsername ? 'You' : user.username}
                        <span className="leaderboard-medal" style={{marginLeft: '8px'}}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                        </span>
                      </div>
                      <div className="team-member-tasks">
                        {user.tasks_completed} tasks finished
                      </div>
                    </div>
                  ))}
                  {/* Show current user if not in top 3, with their ranking */}
                  {currentUserRank > 3 && (
                    <div className="team-member-item your-rank">
                      <div className="team-member-name">#{currentUserRank} You</div>
                      <div className="team-member-tasks">{currentUserCompleted} tasks finished</div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Friend Modal */}
      <Modal
        isOpen={showAddModal}
        onRequestClose={handleCloseAddModal}
        className="task-modal-content"
        overlayClassName="task-modal-overlay"
        contentLabel="Add Friend"
      >
        <div className="task-modal-header">
          <h2 className="task-modal-title">ADD USER</h2>
          <button className="task-modal-close" onClick={handleCloseAddModal}>×</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); handleAddFriend(); }}>
          <label className="task-modal-label">Username</label>
          <input
            type="text"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="Enter username"
            className="task-input"
          />
          
          <div className="task-modal-footer">
            <button type="submit" className="task-button task-button-primary">
              ADD
            </button>
          </div>
        </form>
      </Modal>


    </div>
  );
}

export default Community;
