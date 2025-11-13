import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import frogIcon from '../assets/frog-icon.png';

function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
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
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("https://backend-purple-field-5089.fly.dev/api/users/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: formData.username,
          hashed_password: formData.password,
          coins: 0
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log("User created:", data);
        navigate("/"); 
      } else {
        const errorData = await response.json();

        const newErrors = {};
        if (errorData.username) {
          newErrors.username = errorData.username[0]; 
        } else {
          newErrors.general = "Signup failed. Please try again.";
        }

        setErrors(prev => ({ ...prev, ...newErrors }));
        console.error("Signup error:", errorData);
      }
    } catch (error) {
      console.error("Network or server error:", error);
      setErrors(prev => ({
        ...prev,
        general: "An unexpected error occurred. Please try again."
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container auth-page">
      <div className="form-card">
        {/* <div className="pet-character">🐸</div> */}
        <img src={frogIcon} alt="Motivatchi Pet" className="pet-character" />
        <h1 className="page-title">Create an Account</h1>
        
        <form onSubmit={handleSubmit} className="auth-form">
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
          
          <div className="form-group">
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Confirm Password"
              className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
              required
            />
            {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
          </div>
          
          <button type="submit" className="primary-button" disabled={isLoading}>
            {isLoading ? 'Creating Account...' : 'Sign up'}
          </button>
        </form>
        
        <div className="auth-links">
          <p>Already have an account? <span className="auth-link" onClick={() => navigate('/')}>Login here</span></p>
        </div>
      </div>
    </div>
  );
}

export default Signup;