# CarTrack - Self-Hosted Car Tracking Application

A modern, self-hostable web application for tracking your vehicles, fuel consumption, parts inventory, and maintenance records.

## Features

### Vehicle Management
- **Multi-Vehicle Support**: Track multiple vehicles with detailed information
- **Dashboard View**: Quick overview of all your cars with color-coded borders
- **Insurance Tracking**: Visual indicators for active (green) or expired (red) insurance
- **Automatic Mileage Updates**: Car mileage automatically syncs with fuel records

### Fuel Tracking
- **Fuel Records**: Log every refueling with date, mileage, liters, and price
- **Automatic Calculations**: Average consumption (L/100km), price per km, and price per 100km
- **History View**: Complete fuel consumption history with sortable table

### Parts Inventory
- **Parts Catalog**: Track replacement parts and components
- **Image Support**: Upload photos of parts for easy identification
- **Detailed Information**: Main component, detailed component, model, price, and purchase date

### Authentication & Personalization
- **PIN Authentication**: Secure 4-digit PIN code protection (no username/password needed)
- **Multi-language Support**: English, Spanish, and Polish (auto-detects browser language)
- **Dark/Light Theme**: Modern dark theme by default with light mode option
- **Color Coding**: Assign custom colors to each vehicle for easy identification

### Technical Features
- **SQLite Database**: Lightweight, file-based database for easy backups
- **Modern UI**: Smooth, responsive design that works on desktop and mobile
- **Dockerized**: Easy deployment with Docker and Docker Compose
- **Session Management**: Secure session handling with automatic expiration

## Quick Start with Docker Compose

1. Clone or download this repository

2. Build and start the container:
```bash
docker-compose up -d
```

3. Access the application at `http://localhost:3001`

4. On first run, you'll be prompted to create a 4-digit PIN code

## Manual Installation (Development)

### Prerequisites
- Node.js 18 or higher
- npm

### Installation Steps

1. Install backend dependencies:
```bash
npm install
```

2. Install frontend dependencies:
```bash
cd client
npm install
cd ..
```

3. Start the development server:
```bash
npm run dev
```

The backend will run on `http://<IP>:3001` and the frontend on `http://<IP>:3000`

## Production Build

1. Build the frontend:
```bash
cd client
npm run build
cd ..
```

2. Start the production server:
```bash
npm start
```

## Data Tracked

### Vehicle Information
- **Brand**: Manufacturer name (e.g., Toyota, BMW, Tesla)
- **Model**: Vehicle model (e.g., Corolla, X5, Model 3)
- **VIN**: Vehicle Identification Number
- **License Plate**: Vehicle registration number
- **Current Mileage**: Odometer reading in kilometers (auto-updated from fuel records)
- **Insurance Expiry Date**: When insurance expires (color-coded indicator)
- **Color**: Visual color tag for easy identification

### Fuel Records (per vehicle)
- **Date**: When the refueling occurred
- **Mileage**: Odometer reading at time of refueling
- **Liters**: Amount of fuel added
- **Price Paid**: Total cost of refueling
- **Calculated Metrics**: Consumption (L/100km), price per km, price per 100km

### Parts Inventory (per vehicle)
- **Main Component**: Category of the part (e.g., Engine, Brakes, Suspension)
- **Detailed Component**: Specific part name
- **Model**: Part model or reference number
- **Picture**: Optional photo of the part
- **Price**: Cost of the part
- **Purchase Date**: When the part was acquired

## Usage

### First Time Setup
1. Open the application
2. Create a 4-digit PIN
3. Confirm the PIN
4. You're ready to start adding cars!

### Adding a Car
1. Click the "+ Add Car" button in the top right
2. Fill in all the vehicle information
3. Pick a color using the color picker
4. Click "Add Car"

### Viewing Car Details
1. Click on any car card in the dashboard
2. View all detailed information
3. Click "Edit" to modify information
4. Click "Delete" to remove the car

### Managing Fuel Records
1. Open a car from the dashboard
2. Click the "Fuel Records" tab
3. Click "+ Add Fuel Record"
4. Fill in the date, mileage, liters, and price
5. The system automatically calculates consumption and costs

### Managing Parts Inventory
1. Open a car from the dashboard
2. Click the "Parts Inventory" tab
3. Click "+ Add Part"
4. Fill in component details and optionally upload a picture
5. Parts are displayed in a grid with all information

### Insurance Status
- 🟢 Green indicator: Insurance is active
- 🔴 Red indicator: Insurance has expired (will pulse to draw attention)

## Docker Configuration

### Volumes
The application uses two persistent volumes:
- `./data:/app/data` - SQLite database storage
- `./media:/app/media` - Parts inventory photos

### Ports
- `3001` - Web interface and API

### Environment Variables
- `NODE_ENV`: Set to `production` in Docker
- `PORT`: Application port (default: 3001)
- `DB_PATH`: Path to SQLite database file (default: `/app/data/cartrack.db`)
- `MEDIA_PATH`: Path to media storage (default: `/app/media`)

## Data Backup

Your data is stored in the SQLite database and media files:
- **Database**: `./data/cartrack.db` (Docker) or `./server/cartrack.db` (Development)
- **Media Files**: `./media/` directory (parts photos)

### Backup Commands
```bash
# Backup database
docker cp cartrack:/app/data/cartrack.db ./backup.db

# Backup media files
docker cp cartrack:/app/media ./backup-media

# Or backup the entire volumes directory
tar -czf cartrack-backup-$(date +%Y%m%d).tar.gz data/ media/
```

### Restore from Backup
```bash
# Restore database
docker cp ./backup.db cartrack:/app/data/cartrack.db

# Restore media
docker cp ./backup-media/. cartrack:/app/media/

# Restart container
docker-compose restart
```

## Security

- PIN codes are hashed using bcrypt before storage
- No user accounts or passwords required
- All data stored locally on your server
- No external dependencies or cloud services

## Technology Stack

### Frontend
- React 18
- Modern CSS with animations
- Responsive design
- Axios for API calls

### Backend
- Node.js with Express
- Better-sqlite3 for database
- Bcrypt for PIN hashing
- RESTful API architecture

### Infrastructure
- Docker multi-stage builds for optimal image size
- Health checks for container monitoring
- Volume persistence for data safety

## Troubleshooting

### Container won't start
```bash
docker-compose logs cartrack
```

### Reset PIN
If you forget your PIN, you'll need to delete the database:
```bash
rm ./data/cartrack.db
```
Note: This will delete all your car data as well.

### Port already in use
Change the port mapping in `docker-compose.yml`:
```yaml
ports:
  - "8080:3001"  # Change 8080 to any available port
```

## Development

### Project Structure
```
cartrack/
├── client/                # React frontend
│   ├── public/
│   └── src/
│       ├── components/    # React components
│       │   ├── Dashboard.js
│       │   ├── CarDetail.js
│       │   ├── FuelRecords.js
│       │   ├── PartsInventory.js
│       │   ├── AddCarModal.js
│       │   ├── PinSetup.js
│       │   ├── PinLogin.js
│       │   └── ThemeToggle.js
│       ├── context/
│       │   └── AppContext.js    # Theme & i18n state
│       ├── i18n/
│       │   └── translations.js  # Multi-language support
│       ├── App.js
│       └── index.js
├── server/                # Node.js backend
│   └── index.js           # Express API + SQLite database
├── data/                  # Database storage (created on first run)
├── media/                 # Parts photos (created on first run)
├── Dockerfile
├── docker-compose.yml
└── package.json
```

### API Endpoints

#### Authentication
- `GET /api/auth/status` - Check if PIN is set up
- `GET /api/auth/session` - Validate session token
- `POST /api/auth/setup` - Create initial PIN
- `POST /api/auth/verify` - Verify PIN and create session

#### Cars
- `GET /api/cars` - Get all cars
- `GET /api/cars/:id` - Get specific car
- `POST /api/cars` - Create new car
- `PUT /api/cars/:id` - Update car (supports partial updates)
- `DELETE /api/cars/:id` - Delete car

#### Fuel Records
- `GET /api/cars/:carId/fuel` - Get all fuel records for a car
- `POST /api/cars/:carId/fuel` - Create new fuel record
- `PUT /api/fuel/:id` - Update fuel record
- `DELETE /api/fuel/:id` - Delete fuel record

#### Parts Inventory
- `GET /api/cars/:carId/parts` - Get all parts for a car
- `POST /api/cars/:carId/parts` - Create new part (with optional file upload)
- `PUT /api/parts/:id` - Update part (with optional file upload)
- `DELETE /api/parts/:id` - Delete part

#### Media
- `GET /media/:filename` - Serve uploaded part images

## Database Schema

### Tables

**auth**: PIN authentication
- `id`, `pin_hash`, `created_at`

**cars**: Vehicle information
- `id`, `brand`, `model`, `vin`, `license_plate`, `current_mileage`, `insurance_expiry`, `color`, `created_at`, `updated_at`

**fuel_records**: Fuel tracking
- `id`, `car_id` (FK), `date`, `mileage`, `liters`, `price_paid`, `created_at`

**parts_inventory**: Parts catalog
- `id`, `car_id` (FK), `main_component`, `detailed_component`, `model`, `picture_path`, `price`, `purchase_date`, `created_at`

## License

This is a self-hosted application. Feel free to modify and use as needed.

## Support

For issues or questions, check the application logs:
```bash
docker-compose logs -f cartrack
```
