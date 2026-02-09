import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useApp } from '../context/AppContext';
import './PartsInventory.css';

function PartsInventory({ carId }) {
  const { t } = useApp();
  const [parts, setParts] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    main_component: '',
    detailed_component: '',
    model: '',
    price: '',
    purchase_date: new Date().toISOString().split('T')[0]
  });
  const [pictureFile, setPictureFile] = useState(null);
  const [picturePreview, setPicturePreview] = useState(null);

  useEffect(() => {
    fetchParts();
  }, [carId]);

  const fetchParts = async () => {
    try {
      const response = await axios.get(`/api/cars/${carId}/parts`);
      setParts(response.data);
    } catch (error) {
      console.error('Error fetching parts:', error);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPictureFile(file);
      // Create preview URL
      const previewURL = URL.createObjectURL(file);
      setPicturePreview(previewURL);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Create FormData to send file and data
      const data = new FormData();
      data.append('main_component', formData.main_component);
      data.append('detailed_component', formData.detailed_component);
      data.append('model', formData.model);
      data.append('price', formData.price);
      data.append('purchase_date', formData.purchase_date);

      // Add picture file if selected
      if (pictureFile) {
        data.append('picture', pictureFile);
      }

      if (editingId) {
        await axios.put(`/api/parts/${editingId}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await axios.post(`/api/cars/${carId}/parts`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      setFormData({
        main_component: '',
        detailed_component: '',
        model: '',
        price: '',
        purchase_date: new Date().toISOString().split('T')[0]
      });
      setPictureFile(null);
      setPicturePreview(null);
      setShowAddForm(false);
      setEditingId(null);
      fetchParts();
    } catch (error) {
      console.error('Error saving part:', error);
      alert('Failed to save part');
    }
  };

  const handleEdit = (part) => {
    setFormData({
      main_component: part.main_component,
      detailed_component: part.detailed_component,
      model: part.model,
      price: part.price,
      purchase_date: part.purchase_date
    });
    // Show existing image if available
    setPicturePreview(part.picture_path || null);
    setPictureFile(null); // Clear file input
    setEditingId(part.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this part?')) {
      try {
        await axios.delete(`/api/parts/${id}`);
        fetchParts();
      } catch (error) {
        console.error('Error deleting part:', error);
        alert('Failed to delete part');
      }
    }
  };

  const handleCancel = () => {
    setFormData({
      main_component: '',
      detailed_component: '',
      model: '',
      price: '',
      purchase_date: new Date().toISOString().split('T')[0]
    });
    setPictureFile(null);
    setPicturePreview(null);
    setShowAddForm(false);
    setEditingId(null);
  };

  // Helper function to detect if text is a URL and extract domain
  const isURL = (text) => {
    try {
      const urlPattern = /^(https?:\/\/)?([\w\d-]+\.)+[\w\d]{2,}(\/.*)?$/i;
      return urlPattern.test(text);
    } catch {
      return false;
    }
  };

  const getDomainFromURL = (url) => {
    try {
      // Add protocol if missing
      const fullURL = url.startsWith('http') ? url : `https://${url}`;
      const urlObj = new URL(fullURL);
      // Remove 'www.' prefix if exists
      return urlObj.hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  };

  const getFullURL = (url) => {
    return url.startsWith('http') ? url : `https://${url}`;
  };

  const renderModelField = (model) => {
    if (isURL(model)) {
      const domain = getDomainFromURL(model);
      const fullURL = getFullURL(model);
      return (
        <a
          href={fullURL}
          target="_blank"
          rel="noopener noreferrer"
          className="model-link"
        >
          {domain}
        </a>
      );
    }
    return model;
  };

  return (
    <div className="parts-inventory">
      <div className="parts-header">
        <h3>{t('partsInventory')}</h3>
        {!showAddForm && (
          <button className="add-part-btn" onClick={() => setShowAddForm(true)}>
            + {t('addPart')}
          </button>
        )}
      </div>

      {showAddForm && (
        <form className="parts-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-field">
              <label>{t('mainComponent')}</label>
              <input
                type="text"
                value={formData.main_component}
                onChange={(e) => setFormData({ ...formData, main_component: e.target.value })}
                placeholder="e.g., Engine, Brakes, Suspension"
                required
              />
            </div>
            <div className="form-field">
              <label>{t('detailedComponent')}</label>
              <input
                type="text"
                value={formData.detailed_component}
                onChange={(e) => setFormData({ ...formData, detailed_component: e.target.value })}
                placeholder="e.g., Front brake pads, Oil filter"
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>{t('model')}</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="e.g., Bosch XYZ-123"
                required
              />
            </div>
            <div className="form-field">
              <label>{t('price')}</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
                min="0"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>{t('purchaseDate')}</label>
              <input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                required
              />
            </div>
            <div className="form-field">
              <label>{t('uploadPicture')}</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="file-input"
              />
            </div>
          </div>
          {picturePreview && (
            <div className="picture-preview">
              <img src={picturePreview} alt="Preview" />
            </div>
          )}
          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={handleCancel}>
              {t('cancel')}
            </button>
            <button type="submit" className="submit-btn">
              {editingId ? t('save') : t('addPart')}
            </button>
          </div>
        </form>
      )}

      {parts.length === 0 ? (
        <div className="empty-state-parts">
          <p>{t('noParts')}</p>
        </div>
      ) : (
        <div className="parts-grid">
          {parts.map((part) => (
            <div key={part.id} className="part-card">
              {part.picture_path && (
                <div className="part-image">
                  <img src={part.picture_path} alt={part.detailed_component} />
                </div>
              )}
              <div className="part-content">
                <div className="part-header">
                  <h4>{part.main_component}</h4>
                  <div className="part-actions">
                    <button className="edit-icon-btn" onClick={() => handleEdit(part)} title={t('edit')}>
                      ✏️
                    </button>
                    <button className="delete-icon-btn" onClick={() => handleDelete(part.id)} title={t('delete')}>
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="part-details">
                  <div className="part-detail-row">
                    <span className="detail-label">{t('detailedComponent')}:</span>
                    <span className="detail-value">{part.detailed_component}</span>
                  </div>
                  <div className="part-detail-row">
                    <span className="detail-label">{t('model')}:</span>
                    <span className="detail-value">{renderModelField(part.model)}</span>
                  </div>
                  <div className="part-detail-row">
                    <span className="detail-label">{t('price')}:</span>
                    <span className="detail-value">{parseFloat(part.price).toFixed(2)} zł</span>
                  </div>
                  <div className="part-detail-row">
                    <span className="detail-label">{t('purchaseDate')}:</span>
                    <span className="detail-value">{(() => {
                      const date = new Date(part.purchase_date);
                      const day = String(date.getDate()).padStart(2, '0');
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const year = date.getFullYear();
                      return `${day}/${month}/${year}`;
                    })()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PartsInventory;
