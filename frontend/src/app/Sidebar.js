import { Link } from "react-router-dom";
import { FaHome, FaClipboardList, FaBell, FaChartLine, FaUsers } from "react-icons/fa";

const Sidebar = () => {
  return (
    <div className="sidebar-custom">
      <nav>
        <ul>
          <li><Link to="/dashboard"><FaHome size={36} color="#e4eec6ff" /></Link></li>
          <li><Link to="/tasks"><FaClipboardList size={36} color="#e4eec6ff" /></Link></li>
          <li><Link to="/notifications"><FaBell size={36} color="#e4eec6ff" /></Link></li>
          <li><Link to="/analytics"><FaChartLine size={36} color="#e4eec6ff" /></Link></li>
          <li><Link to="/community"><FaUsers size={36} color="#e4eec6ff" /></Link></li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;
