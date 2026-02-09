import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useApp } from '../context/AppContext';
import ThemeToggle from './ThemeToggle';
import AddCarModal from './AddCarModal';
import './Dashboard.css';

function Dashboard({ onCarSelect }) {
  const { t } = useApp();
  const [cars, setCars] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCars();
  }, []);

  const fetchCars = async () => {
    try {
      const response = await axios.get('/api/cars');
      setCars(response.data);
    } catch (error) {
      console.error('Error fetching cars:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCar = async (carData) => {
    try {
      await axios.post('/api/cars', carData);
      fetchCars();
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding car:', error);
      throw error;
    }
  };

  const getInsuranceStatus = (expiryDate) => {
    if (!expiryDate) return 'expired';

    const today = new Date();
    const expiry = new Date(expiryDate);
    const twoMonthsFromNow = new Date();
    twoMonthsFromNow.setMonth(today.getMonth() + 2);

    if (expiry < today) {
      return 'expired';
    } else if (expiry < twoMonthsFromNow) {
      return 'expiring-soon';
    } else {
      return 'active';
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>🚗 {t('myCars')}</h1>
          <div className="header-actions">
            <ThemeToggle />
            <button className="add-car-btn" onClick={() => setShowAddModal(true)}>
              + {t('addCar')}
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {cars.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🚗</div>
            <h2>{t('noCarsYet')}</h2>
            <p>{t('addFirstCar')}</p>
            <button className="add-car-btn-large" onClick={() => setShowAddModal(true)}>
              + {t('addYourFirstCar')}
            </button>
          </div>
        ) : (
          <div className="cars-grid">
            {cars.map((car) => (
              <div
                key={car.id}
                className="car-card"
                onClick={() => onCarSelect(car)}
                style={{ borderColor: car.color }}
              >
                <div className="car-card-content">
                  <div className="car-header">
                    <h3>{car.brand} {car.model}</h3>
                    <div className={`insurance-status ${getInsuranceStatus(car.insurance_expiry)}`}>
                      {getInsuranceStatus(car.insurance_expiry) === 'expired' && '🔴'}
                      {getInsuranceStatus(car.insurance_expiry) === 'expiring-soon' && '🟠'}
                      {getInsuranceStatus(car.insurance_expiry) === 'active' && '🟢'}
                    </div>
                  </div>
                  <div className="car-info">
                    <div className="info-row">
                      <span className="info-label">{t('vin')}:</span>
                      <span className="info-value">{car.vin}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">{t('licensePlate')}:</span>
                      <span className="info-value">{car.license_plate || '-'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">{t('mileage')}:</span>
                      <span className="info-value">{car.current_mileage.toLocaleString()} {t('km')}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">{t('color')}:</span>
                      <div className="color-display">
                        <div
                          className="color-circle"
                          style={{ backgroundColor: car.color }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddCarModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddCar}
        />
      )}
    </div>
  );
}

export default Dashboard;
