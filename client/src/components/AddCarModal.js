import React, { useState } from 'react';
import './AddCarModal.css';
import { useApp } from '../context/AppContext';

function AddCarModal({ onClose, onSubmit }) {
  const { t } = useApp();
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    vin: '',
    license_plate: '',
    current_mileage: '',
    insurance_expiry: '',
    color: '#000000'
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.brand || !formData.model || !formData.vin || !formData.current_mileage) {
      setError(t('fillAllFields'));
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      setError('Failed to add car. Please try again.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('addNewCar')}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('brand')} *</label>
            <input
              type="text"
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              placeholder={t('brandPlaceholder')}
              required
            />
          </div>

          <div className="form-group">
            <label>{t('model')} *</label>
            <input
              type="text"
              name="model"
              value={formData.model}
              onChange={handleChange}
              placeholder={t('modelPlaceholder')}
              required
            />
          </div>

          <div className="form-group">
            <label>{t('vin')} *</label>
            <input
              type="text"
              name="vin"
              value={formData.vin}
              onChange={handleChange}
              placeholder={t('vinPlaceholder')}
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
              placeholder={t('licensePlatePlaceholder')}
            />
          </div>

          <div className="form-group">
            <label>{t('currentMileage')} ({t('km')}) *</label>
            <input
              type="number"
              name="current_mileage"
              value={formData.current_mileage}
              onChange={handleChange}
              placeholder={t('mileagePlaceholder')}
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

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              {t('cancel')}
            </button>
            <button type="submit" className="submit-btn">
              {t('addCar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddCarModal;
