import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PinSetup from './components/PinSetup';
import PinLogin from './components/PinLogin';
import Dashboard from './components/Dashboard';
import CarDetail from './components/CarDetail';
import './App.css';

function App() {
  const [isSetup, setIsSetup] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedCar, setSelectedCar] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check if PIN is set up
      const response = await axios.get('/api/auth/status');
      setIsSetup(response.data.isSetup);

      // Check if we have a valid session token
      const sessionToken = localStorage.getItem('sessionToken');
      if (sessionToken) {
        const sessionResponse = await axios.get('/api/auth/session', {
          headers: { 'x-session-token': sessionToken }
        });

        if (sessionResponse.data.valid) {
          setIsAuthenticated(true);
          // Set up axios interceptor for this session
          setupAxiosInterceptor(sessionToken);
        } else {
          // Session expired, clear it
          localStorage.removeItem('sessionToken');
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      localStorage.removeItem('sessionToken');
    } finally {
      setLoading(false);
    }
  };

  const setupAxiosInterceptor = (sessionToken) => {
    // Add session token to all requests
    axios.interceptors.request.use(
      (config) => {
        config.headers['x-session-token'] = sessionToken;
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Handle session expiration
    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401 && error.response.data.sessionExpired) {
          // Session expired, log out
          localStorage.removeItem('sessionToken');
          setIsAuthenticated(false);
        }
        return Promise.reject(error);
      }
    );
  };

  const handleSetupComplete = (sessionToken) => {
    localStorage.setItem('sessionToken', sessionToken);
    setupAxiosInterceptor(sessionToken);
    setIsSetup(true);
    setIsAuthenticated(true);
  };

  const handleLoginSuccess = (sessionToken) => {
    localStorage.setItem('sessionToken', sessionToken);
    setupAxiosInterceptor(sessionToken);
    setIsAuthenticated(true);
  };

  const handleCarSelect = (car) => {
    setSelectedCar(car);
  };

  const handleBackToDashboard = () => {
    setSelectedCar(null);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!isSetup) {
    return <PinSetup onSetupComplete={handleSetupComplete} />;
  }

  if (!isAuthenticated) {
    return <PinLogin onLoginSuccess={handleLoginSuccess} />;
  }

  if (selectedCar) {
    return <CarDetail car={selectedCar} onBack={handleBackToDashboard} />;
  }

  return <Dashboard onCarSelect={handleCarSelect} />;
}

export default App;
