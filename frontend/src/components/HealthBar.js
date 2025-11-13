import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import heartIcon from "../assets/heart.png";
import axios from "axios";

const HealthBar = forwardRef(({ health: healthProp }, ref) => {
  const [health, setHealth] = useState(5);

  const fetchHealth = async () => {
    try {
      const response = await axios.get("https://motivatchi-backend.onrender.com/api/tamagotchi/health/", {
        withCredentials: true,
      });
      setHealth(response.data.health);
    } catch (error) {
      console.error("Failed to fetch health:", error);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof healthProp === 'number') {
      setHealth(healthProp);
    }
  }, [healthProp]);

  useImperativeHandle(ref, () => ({
    refreshHealth: fetchHealth
  }));

  const heartCount = Math.round(health);

  return (
    <div className="hearts">
      {Array.from({ length: heartCount }, (_, i) => (
        <img key={i} src={heartIcon} alt="Heart" className="heart" />
      ))}
    </div>
  );
});

export default HealthBar;