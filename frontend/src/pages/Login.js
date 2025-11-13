import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import frogIcon from '../assets/frog-icon.png';

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch("http://localhost:8000/api/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include", // ✅ critical for sending & receiving cookies
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        })
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Login successful:", data);
        navigate("/dashboard");
      } else {
        const newErrors = {};
        if (data.detail === "Invalid username or password.") {
          newErrors.password = "Invalid username or password.";
        } else if (data.detail) {
          newErrors.general = data.detail;
        } else {
          newErrors.general = "Login failed. Please try again.";
        }
        setErrors(newErrors);
      }
    } catch (error) {
      console.error("Network or server error:", error);
      setErrors({ general: "An unexpected error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="page-container auth-page">
      <div className="form-card">
        {/* <div className="pet-character">�</div> */}
        <img src={frogIcon} alt="Motivatchi Pet" className="pet-character" />
        <h1 className="page-title">Welcome to Motivatchi</h1>
        
        <form onSubmit={handleSubmit} className="auth-form">
          {errors.general && <div className="error-message general-error">{errors.general}</div>}
          <div className="form-group">
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Username"
              className={`form-input ${errors.username ? 'error' : ''}`}
              required
            />
            {errors.username && <span className="error-message">{errors.username}</span>}
          </div>
          
          <div className="form-group">
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Password"
              className={`form-input ${errors.password ? 'error' : ''}`}
              required
            />
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>
          
          <div className="auth-links">
            <p><span className="auth-link" onClick={() => navigate('/signup')}>Create an Account</span></p>
          </div>
          
          <button type="submit" className="primary-button" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;