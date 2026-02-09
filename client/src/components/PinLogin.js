import React, { useState } from 'react';
import axios from 'axios';
import { useApp } from '../context/AppContext';
import ThemeToggle from './ThemeToggle';
import './PinSetup.css';

function PinLogin({ onLoginSuccess }) {
  const { t } = useApp();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pin.length !== 4) {
      setError(t('pinMustBe4Digits'));
      return;
    }

    try {
      const response = await axios.post('/api/auth/verify', { pin });
      if (response.data.valid) {
        onLoginSuccess(response.data.sessionToken);
      } else {
        setError(t('invalidPin'));
        setPin('');
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Login failed');
      setPin('');
    }
  };

  const handlePinInput = (value) => {
    if (/^\d*$/.test(value) && value.length <= 4) {
      setPin(value);
      setError('');
    }
  };

  return (
    <div className="pin-container">
      <div className="theme-toggle-container">
        <ThemeToggle />
      </div>
      <div className="pin-card">
        <div className="pin-header">
          <div className="car-icon">🚗</div>
          <h1>{t('appName')}</h1>
          <p className="subtitle">{t('enterPin')}</p>
        </div>

        <form onSubmit={handleSubmit} className="pin-form">
          <input
            type="password"
            inputMode="numeric"
            maxLength="4"
            value={pin}
            onChange={(e) => handlePinInput(e.target.value)}
            placeholder="••••"
            className="pin-input"
            autoFocus
          />
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="pin-button">
            {t('unlock')}
          </button>
        </form>
      </div>
    </div>
  );
}

export default PinLogin;
