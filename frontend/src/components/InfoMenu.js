import React, { useState } from 'react';
import { FaInfo } from 'react-icons/fa';
import Modal from 'react-modal';
import '../pages/Modal.css';
import coinIcon from '../assets/coin-icon.png';

const InfoMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = (e) => {
    setIsOpen(true);
  };

  return (
    <div className="user-menu-container">
      <button
        className="info-button user-menu-button"
        aria-label="App info"
        title="How to use Motivatchi"
        onClick={openModal}
      >
        <FaInfo size={18} />
      </button>

      <Modal
        isOpen={!!isOpen}
        onRequestClose={() => setIsOpen(false)}
        overlayClassName="task-modal-overlay"
        className="task-modal-content info-modal-content"
      >
        <div className="task-modal-header">
          <h2 className="info-modal-title">How to use Motivatchi</h2>
          <button className="task-modal-close" onClick={() => setIsOpen(false)} aria-label="Close">×</button>
        </div>

        <div className="info-modal-body">
          <p>
            Stay motivated with Motivatchi! Your pet grows and stays happy as you finish tasks, but needs your care 
            when you fall behind. Earn coins, gain XP, and level up while keeping both you and your pet on track
          </p>

          <div className="info-section">
            <h3>Tasks</h3>
            <p>
              Create, organize, and track your tasks by category, deadline, and priority. 
              Filter what you see, modify tasks anytime, and mark them complete to earn 
              coins when you’re done.
            </p>
            <ul className="info-list">
              <li><img src={coinIcon} alt="coin" className="info-coin"/>High priority: 30 coins</li>
              <li><img src={coinIcon} alt="coin" className="info-coin"/>Medium priority: 20 coins</li>
              <li><img src={coinIcon} alt="coin" className="info-coin"/>Low priority: 10 coins</li>
            </ul>
          </div>

          <div className="info-section">
            <h3>Notifications</h3>
            <p>
              Get reminders for upcoming and overdue tasks, plus updates when friends join or interact with you. 
              Stay on track and keep your pet happy with helpful notifications.
            </p>
          </div>

          <div className="info-section">
            <h3>Analytics</h3>
            <p>
              Get a clear picture of your progress with Analytics. 
              See completed, missed, and upcoming tasks, and switch between weekly or 
              monthly views to spot trends and boost your productivity.
            </p>
          </div>

          <div className="info-section">
            <h3>Community</h3>
            <p>
              Add friends, check out their Motivatchi pets, and join community
              challenges. Completing weekly challenges helps you make more friends
              and earn extra coins <img src={coinIcon} alt="coin" className="info-coin"/>.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InfoMenu;
