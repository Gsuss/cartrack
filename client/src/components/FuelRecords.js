import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useApp } from '../context/AppContext';
import './FuelRecords.css';

function FuelRecords({ carId }) {
  const { t } = useApp();
  const [records, setRecords] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    mileage: '',
    liters: '',
    price_paid: ''
  });

  useEffect(() => {
    fetchRecords();
  }, [carId]);

  const fetchRecords = async () => {
    try {
      const response = await axios.get(`/api/cars/${carId}/fuel`);
      setRecords(response.data);
    } catch (error) {
      console.error('Error fetching fuel records:', error);
    }
  };

  const calculateStats = (record, index) => {
    if (index === records.length - 1) {
      // First record, no previous to compare
      return { avgConsumption: '-', avgPricePerKm: '-', avgPricePer100Km: '-' };
    }

    const prevRecord = records[index + 1];
    const kmDriven = record.mileage - prevRecord.mileage;

    if (kmDriven <= 0) {
      return { avgConsumption: '-', avgPricePerKm: '-', avgPricePer100Km: '-' };
    }

    // Average consumption: liters / 100km
    const avgConsumption = ((record.liters / kmDriven) * 100).toFixed(2);

    // Average price per km
    const avgPricePerKm = (record.price_paid / kmDriven).toFixed(2);

    // Average price per 100km
    const avgPricePer100Km = ((record.price_paid / kmDriven) * 100).toFixed(2);

    return { avgConsumption, avgPricePerKm, avgPricePer100Km };
  };

  const updateCarMileage = async () => {
    try {
      // Get all fuel records to find the highest mileage
      const response = await axios.get(`/api/cars/${carId}/fuel`);
      const allRecords = response.data;

      if (allRecords.length > 0) {
        // Find the maximum mileage
        const maxMileage = Math.max(...allRecords.map(r => r.mileage));

        // Update the car's current_mileage
        await axios.put(`/api/cars/${carId}`, {
          current_mileage: maxMileage
        });
      }
    } catch (error) {
      console.error('Error updating car mileage:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`/api/fuel/${editingId}`, formData);
      } else {
        await axios.post(`/api/cars/${carId}/fuel`, formData);
      }
      setFormData({
        date: new Date().toISOString().split('T')[0],
        mileage: '',
        liters: '',
        price_paid: ''
      });
      setShowAddForm(false);
      setEditingId(null);
      await fetchRecords();
      await updateCarMileage();
    } catch (error) {
      console.error('Error saving fuel record:', error);
      alert('Failed to save fuel record');
    }
  };

  const handleEdit = (record) => {
    setFormData({
      date: record.date,
      mileage: record.mileage,
      liters: record.liters,
      price_paid: record.price_paid
    });
    setEditingId(record.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        await axios.delete(`/api/fuel/${id}`);
        await fetchRecords();
        await updateCarMileage();
      } catch (error) {
        console.error('Error deleting fuel record:', error);
        alert('Failed to delete fuel record');
      }
    }
  };

  const handleCancel = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      mileage: '',
      liters: '',
      price_paid: ''
    });
    setShowAddForm(false);
    setEditingId(null);
  };

  return (
    <div className="fuel-records">
      <div className="fuel-header">
        <h3>{t('fuelRecords')}</h3>
        {!showAddForm && (
          <button className="add-fuel-btn" onClick={() => setShowAddForm(true)}>
            + {t('addFuelRecord')}
          </button>
        )}
      </div>

      {showAddForm && (
        <form className="fuel-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-field">
              <label>{t('date')}</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="form-field">
              <label>{t('mileage')} ({t('km')})</label>
              <input
                type="number"
                value={formData.mileage}
                onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                required
                min="0"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>{t('liters')}</label>
              <input
                type="number"
                step="0.01"
                value={formData.liters}
                onChange={(e) => setFormData({ ...formData, liters: e.target.value })}
                required
                min="0"
              />
            </div>
            <div className="form-field">
              <label>{t('pricePaid')}</label>
              <input
                type="number"
                step="0.01"
                value={formData.price_paid}
                onChange={(e) => setFormData({ ...formData, price_paid: e.target.value })}
                required
                min="0"
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={handleCancel}>
              {t('cancel')}
            </button>
            <button type="submit" className="submit-btn">
              {editingId ? t('save') : t('addFuelRecord')}
            </button>
          </div>
        </form>
      )}

      {records.length === 0 ? (
        <div className="empty-state-fuel">
          <p>{t('noFuelRecords')}</p>
        </div>
      ) : (
        <div className="fuel-table-container">
          <table className="fuel-table">
            <thead>
              <tr>
                <th>{t('date')}</th>
                <th>{t('mileage')}</th>
                <th>{t('liters')}</th>
                <th>{t('pricePaid')}</th>
                <th>{t('pricePerLiter')}</th>
                <th>{t('avgConsumption')}</th>
                <th>{t('avgPricePerKm')}</th>
                <th>{t('avgPricePer100Km')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, index) => {
                const stats = calculateStats(record, index);
                const pricePerLiter = parseFloat(record.price_paid) / parseFloat(record.liters);

                // Calculate price difference (compare with next record since records are sorted by mileage DESC)
                let priceDiff = null;
                let priceColor = '';
                let priceDisplay = `${pricePerLiter.toFixed(2)} zł/L`;

                if (index < records.length - 1) {
                  const nextRecord = records[index + 1];
                  const nextPricePerLiter = parseFloat(nextRecord.price_paid) / parseFloat(nextRecord.liters);
                  priceDiff = pricePerLiter - nextPricePerLiter;

                  if (priceDiff > 0) {
                    // Price increased (more expensive) - RED
                    priceColor = 'price-increase';
                    priceDisplay = `${pricePerLiter.toFixed(2)} zł/L (+${Math.abs(priceDiff).toFixed(2)} zł)`;
                  } else if (priceDiff < 0) {
                    // Price decreased (cheaper) - GREEN
                    priceColor = 'price-decrease';
                    priceDisplay = `${pricePerLiter.toFixed(2)} zł/L (-${Math.abs(priceDiff).toFixed(2)} zł)`;
                  } else {
                    // Same price
                    priceDisplay = `${pricePerLiter.toFixed(2)} zł/L`;
                  }
                }

                const formatDate = (dateString) => {
                  const date = new Date(dateString);
                  const day = String(date.getDate()).padStart(2, '0');
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const year = date.getFullYear();
                  return `${day}/${month}/${year}`;
                };

                return (
                  <tr key={record.id}>
                    <td>{formatDate(record.date)}</td>
                    <td>{record.mileage.toLocaleString()} {t('km')}</td>
                    <td>{parseFloat(record.liters).toFixed(2)} L</td>
                    <td>{parseFloat(record.price_paid).toFixed(2)} zł</td>
                    <td className={priceColor}>{priceDisplay}</td>
                    <td>{stats.avgConsumption !== '-' ? `${stats.avgConsumption} L/100${t('km')}` : '-'}</td>
                    <td>{stats.avgPricePerKm !== '-' ? `${stats.avgPricePerKm} zł/${t('km')}` : '-'}</td>
                    <td>{stats.avgPricePer100Km !== '-' ? `${stats.avgPricePer100Km} zł/100${t('km')}` : '-'}</td>
                    <td className="actions">
                      <button className="edit-icon-btn" onClick={() => handleEdit(record)} title={t('edit')}>
                        ✏️
                      </button>
                      <button className="delete-icon-btn" onClick={() => handleDelete(record.id)} title={t('delete')}>
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default FuelRecords;
