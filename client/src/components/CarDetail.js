import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CarDetail.css';
import { useApp } from '../context/AppContext';
import ThemeToggle from './ThemeToggle';
import FuelRecords from './FuelRecords';
import PartsInventory from './PartsInventory';

function CarDetail({ car, onBack }) {
  const { t } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('fuel');
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    vin: '',
    license_plate: '',
    current_mileage: '',
    insurance_expiry: '',
    color: '#000000'
  });
  const [originalData, setOriginalData] = useState({});

  useEffect(() => {
    const data = {
      brand: car.brand,
      model: car.model,
      vin: car.vin,
      license_plate: car.license_plate || '',
      current_mileage: car.current_mileage,
      insurance_expiry: car.insurance_expiry || '',
      color: car.color
    };
    setFormData(data);
    setOriginalData(data);
  }, [car]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/cars/${car.id}`, formData);
      setIsEditing(false);
      setOriginalData(formData);
    } catch (error) {
      console.error('Error updating car:', error);
      alert('Failed to update car');
    }
  };

  const handleCancel = () => {
    setFormData(originalData);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (window.confirm(t('deleteConfirm'))) {
      try {
        await axios.delete(`/api/cars/${car.id}`);
        onBack();
      } catch (error) {
        console.error('Error deleting car:', error);
        alert('Failed to delete car');
      }
    }
  };

  const getInsuranceStatus = (expiryDate) => {
    if (!expiryDate) return { status: 'expired', icon: '🔴', text: t('expired') };

    const today = new Date();
    const expiry = new Date(expiryDate);
    const twoMonthsFromNow = new Date();
    twoMonthsFromNow.setMonth(today.getMonth() + 2);

    if (expiry < today) {
      return { status: 'expired', icon: '🔴', text: t('expired') };
    } else if (expiry < twoMonthsFromNow) {
      return { status: 'expiring-soon', icon: '🟠', text: t('expiringSoon') };
    } else {
      return { status: 'active', icon: '🟢', text: t('active') };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return t('notSet');
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="car-detail">
      <div className="detail-header">
        <div className="header-left">
          <button className="back-btn" onClick={onBack}>
            ← {t('back')}
          </button>
          <ThemeToggle />
        </div>
        <div className="detail-actions">
          {isEditing ? (
            <>
              <button className="cancel-btn" onClick={handleCancel}>
                {t('cancel')}
              </button>
              <button className="save-btn" onClick={handleSubmit}>
                {t('saveChanges')}
              </button>
            </>
          ) : (
            <>
              <button className="delete-btn" onClick={handleDelete}>
                {t('delete')}
              </button>
              <button className="edit-btn" onClick={() => setIsEditing(true)}>
                {t('edit')}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="detail-content">
        <div className="detail-card">
          <div className="car-color-header" style={{ backgroundColor: formData.color }}></div>

          {isEditing ? (
            <form className="detail-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>{t('brand')}</label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t('model')}</label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t('vin')}</label>
                <input
                  type="text"
                  name="vin"
                  value={formData.vin}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t('licensePlate')}</label>
                <input
                  type="text"
                  name="license_plate"
                  value={formData.license_plate}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>{t('currentMileage')} ({t('km')})</label>
                <input
                  type="number"
                  name="current_mileage"
                  value={formData.current_mileage}
                  onChange={handleChange}
                  required
                  min="0"
                />
              </div>

              <div className="form-group">
                <label>{t('insuranceExpiryDate')}</label>
                <input
                  type="date"
                  name="insurance_expiry"
                  value={formData.insurance_expiry}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>{t('color')}</label>
                <div className="color-picker-container">
                  <input
                    type="color"
                    name="color"
                    value={formData.color}
                    onChange={handleChange}
                    className="color-picker"
                  />
                  <span className="color-value">{formData.color}</span>
                </div>
              </div>
            </form>
          ) : (
            <div className="detail-info">
              <h2>{formData.brand} {formData.model}</h2>

              <div className="info-grid">
                <div className="info-item">
                  <span className="info-item-label">{t('vin')}</span>
                  <span className="info-item-value">{formData.vin}</span>
                </div>

                <div className="info-item">
                  <span className="info-item-label">{t('licensePlate')}</span>
                  <span className="info-item-value">{formData.license_plate || '-'}</span>
                </div>

                <div className="info-item">
                  <span className="info-item-label">{t('currentMileage')}</span>
                  <span className="info-item-value">{formData.current_mileage.toLocaleString()} {t('km')}</span>
                </div>

                <div className="info-item">
                  <span className="info-item-label">{t('insuranceStatus')}</span>
                  <span className={`info-item-value insurance-status-${getInsuranceStatus(formData.insurance_expiry).status}`}>
                    {getInsuranceStatus(formData.insurance_expiry).icon} {getInsuranceStatus(formData.insurance_expiry).text}
                    {formData.insurance_expiry && (
                      <span className="insurance-date"> ({formatDate(formData.insurance_expiry)})</span>
                    )}
                  </span>
                </div>

                <div className="info-item">
                  <span className="info-item-label">{t('color')}</span>
                  <div className="info-item-value">
                    <div className="color-display-large">
                      <div
                        className="color-circle-large"
                        style={{ backgroundColor: formData.color }}
                      ></div>
                      <span>{formData.color}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="tabs-section">
            <div className="tabs-header">
              <button
                className={`tab-button ${activeTab === 'fuel' ? 'active' : ''}`}
                onClick={() => setActiveTab('fuel')}
              >
                {t('fuelRecords')}
              </button>
              <button
                className={`tab-button ${activeTab === 'parts' ? 'active' : ''}`}
                onClick={() => setActiveTab('parts')}
              >
                {t('partsInventory')}
              </button>
            </div>
            <div className="tab-content">
              {activeTab === 'fuel' && (
                <div className="tab-panel">
                  <FuelRecords carId={car.id} />
                </div>
              )}
              {activeTab === 'parts' && (
                <div className="tab-panel">
                  <PartsInventory carId={car.id} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CarDetail;
