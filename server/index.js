const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3001;

// Session management (in-memory, resets on restart)
const sessions = new Map(); // sessionToken -> { createdAt, expiresAt }
const SESSION_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Clean up expired sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (session.expiresAt < now) {
      sessions.delete(token);
      console.log('Expired session removed');
    }
  }
}, 5 * 60 * 1000);

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Database setup
const dbPath = process.env.DB_PATH || path.join(__dirname, 'cartrack.db');
const db = new Database(dbPath);

// Media storage setup
const mediaPath = process.env.MEDIA_PATH || path.join(__dirname, '../media');
if (!fs.existsSync(mediaPath)) {
  fs.mkdirSync(mediaPath, { recursive: true, mode: 0o755 });
  console.log('Media directory created:', mediaPath);
} else {
  console.log('Media directory exists:', mediaPath);
}

// Verify media directory is writable
try {
  const testFile = path.join(mediaPath, '.write-test');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  console.log('Media directory is writable');
} catch (error) {
  console.error('ERROR: Media directory is not writable!', error.message);
  console.error('Please ensure the directory has correct permissions for user 1001:1001');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, mediaPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: part_{timestamp}_{random}.{extension}
    const ext = path.extname(file.originalname);
    const uniqueName = `part_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    // Only accept images
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  }
});

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS auth (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pin_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS cars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    vin TEXT NOT NULL,
    license_plate TEXT,
    current_mileage INTEGER NOT NULL,
    insurance_expiry DATE,
    color TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS fuel_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    car_id INTEGER NOT NULL,
    date DATE NOT NULL,
    mileage INTEGER NOT NULL,
    liters REAL NOT NULL,
    price_paid REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (car_id) REFERENCES cars(id)
  );

  CREATE TABLE IF NOT EXISTS parts_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    car_id INTEGER NOT NULL,
    main_component TEXT NOT NULL,
    detailed_component TEXT NOT NULL,
    model TEXT NOT NULL,
    picture_path TEXT,
    price REAL NOT NULL,
    purchase_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (car_id) REFERENCES cars(id)
  );
`);

// Migration: Add license_plate column if it doesn't exist
try {
  db.prepare('SELECT license_plate FROM cars LIMIT 1').get();
} catch (error) {
  // Column doesn't exist, add it
  console.log('Adding license_plate column to cars table...');
  db.prepare('ALTER TABLE cars ADD COLUMN license_plate TEXT').run();
  console.log('license_plate column added successfully');
}

// Serve media files
app.use('/media', express.static(mediaPath));

// Middleware to check session
const requireAuth = (req, res, next) => {
  const sessionToken = req.headers['x-session-token'];

  if (!sessionToken || !sessions.has(sessionToken)) {
    return res.status(401).json({ error: 'Unauthorized', sessionExpired: true });
  }

  const session = sessions.get(sessionToken);
  const now = Date.now();

  if (session.expiresAt < now) {
    sessions.delete(sessionToken);
    return res.status(401).json({ error: 'Session expired', sessionExpired: true });
  }

  // Session is valid, continue
  next();
};

// Check if PIN is set up (no auth required)
app.get('/api/auth/status', (req, res) => {
  const authRow = db.prepare('SELECT COUNT(*) as count FROM auth').get();
  res.json({ isSetup: authRow.count > 0 });
});

// Check session validity (no auth required, used to validate existing tokens)
app.get('/api/auth/session', (req, res) => {
  const sessionToken = req.headers['x-session-token'];

  if (!sessionToken || !sessions.has(sessionToken)) {
    return res.json({ valid: false });
  }

  const session = sessions.get(sessionToken);
  const now = Date.now();

  if (session.expiresAt < now) {
    sessions.delete(sessionToken);
    return res.json({ valid: false });
  }

  res.json({ valid: true, expiresAt: session.expiresAt });
});

// Setup PIN (first time only)
app.post('/api/auth/setup', async (req, res) => {
  try {
    const { pin } = req.body;

    // Check if already set up
    const authRow = db.prepare('SELECT COUNT(*) as count FROM auth').get();
    if (authRow.count > 0) {
      return res.status(400).json({ error: 'PIN already set up' });
    }

    // Validate PIN
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
    }

    // Hash and store PIN
    const pinHash = await bcrypt.hash(pin, 10);
    db.prepare('INSERT INTO auth (pin_hash) VALUES (?)').run(pinHash);

    res.json({ success: true });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ error: 'Setup failed' });
  }
});

// Verify PIN and create session
app.post('/api/auth/verify', async (req, res) => {
  try {
    const { pin } = req.body;

    const authRow = db.prepare('SELECT pin_hash FROM auth LIMIT 1').get();
    if (!authRow) {
      return res.status(400).json({ error: 'PIN not set up' });
    }

    const isValid = await bcrypt.compare(pin, authRow.pin_hash);

    if (isValid) {
      // Create a new session
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const now = Date.now();
      const expiresAt = now + SESSION_DURATION;

      sessions.set(sessionToken, {
        createdAt: now,
        expiresAt: expiresAt
      });

      console.log(`New session created: ${sessionToken.substring(0, 8)}... expires at ${new Date(expiresAt).toISOString()}`);

      res.json({
        valid: true,
        sessionToken: sessionToken,
        expiresAt: expiresAt
      });
    } else {
      res.json({ valid: false });
    }
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Get all cars
app.get('/api/cars', requireAuth, (req, res) => {
  try {
    const cars = db.prepare('SELECT * FROM cars ORDER BY created_at DESC').all();
    res.json(cars);
  } catch (error) {
    console.error('Get cars error:', error);
    res.status(500).json({ error: 'Failed to fetch cars' });
  }
});

// Get single car
app.get('/api/cars/:id', requireAuth, (req, res) => {
  try {
    const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(req.params.id);
    if (!car) {
      return res.status(404).json({ error: 'Car not found' });
    }
    res.json(car);
  } catch (error) {
    console.error('Get car error:', error);
    res.status(500).json({ error: 'Failed to fetch car' });
  }
});

// Create new car
app.post('/api/cars', requireAuth, (req, res) => {
  try {
    const { brand, model, vin, license_plate, current_mileage, insurance_expiry, color } = req.body;

    const result = db.prepare(`
      INSERT INTO cars (brand, model, vin, license_plate, current_mileage, insurance_expiry, color)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(brand, model, vin, license_plate, current_mileage, insurance_expiry, color);

    const newCar = db.prepare('SELECT * FROM cars WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newCar);
  } catch (error) {
    console.error('Create car error:', error);
    res.status(500).json({ error: 'Failed to create car' });
  }
});

// Update car
app.put('/api/cars/:id', requireAuth, (req, res) => {
  try {
    // Get current car data
    const currentCar = db.prepare('SELECT * FROM cars WHERE id = ?').get(req.params.id);
    if (!currentCar) {
      return res.status(404).json({ error: 'Car not found' });
    }

    // Merge current data with new data (allows partial updates)
    const brand = req.body.brand !== undefined ? req.body.brand : currentCar.brand;
    const model = req.body.model !== undefined ? req.body.model : currentCar.model;
    const vin = req.body.vin !== undefined ? req.body.vin : currentCar.vin;
    const license_plate = req.body.license_plate !== undefined ? req.body.license_plate : currentCar.license_plate;
    const current_mileage = req.body.current_mileage !== undefined ? req.body.current_mileage : currentCar.current_mileage;
    const insurance_expiry = req.body.insurance_expiry !== undefined ? req.body.insurance_expiry : currentCar.insurance_expiry;
    const color = req.body.color !== undefined ? req.body.color : currentCar.color;

    db.prepare(`
      UPDATE cars
      SET brand = ?, model = ?, vin = ?, license_plate = ?, current_mileage = ?,
          insurance_expiry = ?, color = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(brand, model, vin, license_plate, current_mileage, insurance_expiry, color, req.params.id);

    const updatedCar = db.prepare('SELECT * FROM cars WHERE id = ?').get(req.params.id);
    res.json(updatedCar);
  } catch (error) {
    console.error('Update car error:', error);
    res.status(500).json({ error: 'Failed to update car' });
  }
});

// Delete car
app.delete('/api/cars/:id', requireAuth, (req, res) => {
  try {
    db.prepare('DELETE FROM cars WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete car error:', error);
    res.status(500).json({ error: 'Failed to delete car' });
  }
});

// ===== FUEL RECORDS ENDPOINTS =====

// Get all fuel records for a car
app.get('/api/cars/:carId/fuel', requireAuth, (req, res) => {
  try {
    const { carId } = req.params;

    // Verify car exists
    const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(carId);
    if (!car) {
      return res.status(404).json({ error: 'Car not found' });
    }

    const fuelRecords = db.prepare(`
      SELECT * FROM fuel_records
      WHERE car_id = ?
      ORDER BY mileage DESC
    `).all(carId);

    res.json(fuelRecords);
  } catch (error) {
    console.error('Get fuel records error:', error);
    res.status(500).json({ error: 'Failed to fetch fuel records' });
  }
});

// Create new fuel record
app.post('/api/cars/:carId/fuel', requireAuth, (req, res) => {
  try {
    const { carId } = req.params;
    const { date, mileage, liters, price_paid } = req.body;

    // Verify car exists
    const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(carId);
    if (!car) {
      return res.status(404).json({ error: 'Car not found' });
    }

    // Validate required fields
    if (!date || mileage === undefined || !liters || price_paid === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = db.prepare(`
      INSERT INTO fuel_records (car_id, date, mileage, liters, price_paid)
      VALUES (?, ?, ?, ?, ?)
    `).run(carId, date, mileage, liters, price_paid);

    const newRecord = db.prepare('SELECT * FROM fuel_records WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newRecord);
  } catch (error) {
    console.error('Create fuel record error:', error);
    res.status(500).json({ error: 'Failed to create fuel record' });
  }
});

// Update fuel record
app.put('/api/fuel/:id', requireAuth, (req, res) => {
  try {
    const { date, mileage, liters, price_paid } = req.body;

    // Verify fuel record exists
    const fuelRecord = db.prepare('SELECT * FROM fuel_records WHERE id = ?').get(req.params.id);
    if (!fuelRecord) {
      return res.status(404).json({ error: 'Fuel record not found' });
    }

    db.prepare(`
      UPDATE fuel_records
      SET date = ?, mileage = ?, liters = ?, price_paid = ?
      WHERE id = ?
    `).run(date, mileage, liters, price_paid, req.params.id);

    const updatedRecord = db.prepare('SELECT * FROM fuel_records WHERE id = ?').get(req.params.id);
    res.json(updatedRecord);
  } catch (error) {
    console.error('Update fuel record error:', error);
    res.status(500).json({ error: 'Failed to update fuel record' });
  }
});

// Delete fuel record
app.delete('/api/fuel/:id', requireAuth, (req, res) => {
  try {
    const fuelRecord = db.prepare('SELECT * FROM fuel_records WHERE id = ?').get(req.params.id);
    if (!fuelRecord) {
      return res.status(404).json({ error: 'Fuel record not found' });
    }

    db.prepare('DELETE FROM fuel_records WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete fuel record error:', error);
    res.status(500).json({ error: 'Failed to delete fuel record' });
  }
});

// ===== PARTS INVENTORY ENDPOINTS =====

// Get all parts for a car
app.get('/api/cars/:carId/parts', requireAuth, (req, res) => {
  try {
    const { carId } = req.params;

    // Verify car exists
    const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(carId);
    if (!car) {
      return res.status(404).json({ error: 'Car not found' });
    }

    const parts = db.prepare(`
      SELECT * FROM parts_inventory
      WHERE car_id = ?
      ORDER BY created_at DESC
    `).all(carId);

    res.json(parts);
  } catch (error) {
    console.error('Get parts error:', error);
    res.status(500).json({ error: 'Failed to fetch parts' });
  }
});

// Create new part record with file upload
app.post('/api/cars/:carId/parts', requireAuth, upload.single('picture'), (req, res) => {
  try {
    const { carId } = req.params;
    const { main_component, detailed_component, model, price, purchase_date } = req.body;

    // Verify car exists
    const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(carId);
    if (!car) {
      return res.status(404).json({ error: 'Car not found' });
    }

    // Validate required fields
    if (!main_component || !detailed_component || !model || price === undefined || !purchase_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get picture path if file was uploaded
    const picturePath = req.file ? `/media/${req.file.filename}` : null;

    // Insert part with file path
    const result = db.prepare(`
      INSERT INTO parts_inventory (car_id, main_component, detailed_component, model, picture_path, price, purchase_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(carId, main_component, detailed_component, model, picturePath, price, purchase_date);

    const newPart = db.prepare('SELECT * FROM parts_inventory WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newPart);
  } catch (error) {
    console.error('Create part error:', error);
    // Clean up uploaded file if there was an error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to create part record' });
  }
});

// Update part record with optional file upload
app.put('/api/parts/:id', requireAuth, upload.single('picture'), (req, res) => {
  try {
    const { main_component, detailed_component, model, price, purchase_date } = req.body;

    // Verify part exists
    const part = db.prepare('SELECT * FROM parts_inventory WHERE id = ?').get(req.params.id);
    if (!part) {
      return res.status(404).json({ error: 'Part not found' });
    }

    // Handle image update
    let finalPicturePath = part.picture_path; // Keep existing if no new upload

    if (req.file) {
      // New image uploaded - delete old one if it exists
      if (part.picture_path && part.picture_path.startsWith('/media/')) {
        const oldFilePath = path.join(mediaPath, path.basename(part.picture_path));
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          console.log('Deleted old image:', oldFilePath);
        }
      }
      finalPicturePath = `/media/${req.file.filename}`;
    }

    db.prepare(`
      UPDATE parts_inventory
      SET main_component = ?, detailed_component = ?, model = ?, picture_path = ?, price = ?, purchase_date = ?
      WHERE id = ?
    `).run(main_component, detailed_component, model, finalPicturePath, price, purchase_date, req.params.id);

    const updatedPart = db.prepare('SELECT * FROM parts_inventory WHERE id = ?').get(req.params.id);
    res.json(updatedPart);
  } catch (error) {
    console.error('Update part error:', error);
    // Clean up uploaded file if there was an error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to update part record' });
  }
});

// Delete part record
app.delete('/api/parts/:id', requireAuth, (req, res) => {
  try {
    const part = db.prepare('SELECT * FROM parts_inventory WHERE id = ?').get(req.params.id);
    if (!part) {
      return res.status(404).json({ error: 'Part not found' });
    }

    // Delete associated image file if it exists
    if (part.picture_path && part.picture_path.startsWith('/media/')) {
      const filePath = path.join(mediaPath, path.basename(part.picture_path));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('Deleted image file:', filePath);
      }
    }

    db.prepare('DELETE FROM parts_inventory WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete part error:', error);
    res.status(500).json({ error: 'Failed to delete part record' });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
