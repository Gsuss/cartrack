import React, { useState } from 'react';
import axios from 'axios';
import { useApp } from '../context/AppContext';
import ThemeToggle from './ThemeToggle';
import './PinSetup.css';

function PinSetup({ onSetupComplete }) {
  const { t } = useApp();
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  const handlePin1Submit = (e) => {
    e.preventDefault();
    if (pin1.length !== 4) {
      setError(t('pinMustBe4Digits'));
      return;
    }
    setError('');
    setStep(2);
  };

  const handlePin2Submit = async (e) => {
    e.preventDefault();
    if (pin2.length !== 4) {
      setError(t('pinMustBe4Digits'));
      return;
    }
    if (pin1 !== pin2) {
      setError(t('pinsDoNotMatch'));
      setPin1('');
      setPin2('');
      setStep(1);
      return;
    }

    try {
      await axios.post('/api/auth/setup', { pin: pin1 });
      // After setup, log in to get session token
      const loginResponse = await axios.post('/api/auth/verify', { pin: pin1 });
      if (loginResponse.data.valid) {
        onSetupComplete(loginResponse.data.sessionToken);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Setup failed');
    }
  };

  const handlePinInput = (value, setter) => {
    if (/^\d*$/.test(value) && value.length <= 4) {
      setter(value);
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
          <p className="subtitle">{t('firstTimeSetup')}</p>
        </div>

        {step === 1 ? (
          <form onSubmit={handlePin1Submit} className="pin-form">
            <label>{t('createPin')}</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength="4"
              value={pin1}
              onChange={(e) => handlePinInput(e.target.value, setPin1)}
              placeholder="••••"
              className="pin-input"
              autoFocus
            />
            {error && <div className="error-message">{error}</div>}
            <button type="submit" className="pin-button">
              {t('continue')}
            </button>
          </form>
        ) : (
          <form onSubmit={handlePin2Submit} className="pin-form">
            <label>{t('confirmPin')}</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength="4"
              value={pin2}
              onChange={(e) => handlePinInput(e.target.value, setPin2)}
              placeholder="••••"
              className="pin-input"
              autoFocus
            />
            {error && <div className="error-message">{error}</div>}
            <div className="button-group">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setPin2('');
                  setError('');
                }}
                className="pin-button secondary"
              >
                {t('back')}
              </button>
              <button type="submit" className="pin-button">
                {t('completeSetup')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default PinSetup;
