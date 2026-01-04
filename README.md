# SmartFit - AI-Powered Wardrobe Tracker

SmartFit is an intelligent wardrobe management application that uses AI to help you organize your clothes, track your outfits, and get personalized style suggestions.

## Features

### Wardrobe Management
- **Photo Scanning**: Take a photo of your wardrobe to automatically detect and catalog multiple clothing items
- **Single Item Upload**: Add individual clothing pieces with AI-powered attribute detection
- **Smart Categorization**: Automatic detection of category, color, pattern, and suitable occasions

### Outfit Tracking
- **Daily Logging**: Record what you wear each day, either by selecting saved outfits or taking a quick photo
- **Location Tracking**: Log where you're going (work, gym, dates, etc.)
- **Weather & Occasion Tags**: Track context for better future suggestions

### AI-Powered Suggestions
- **Smart Outfit Recommendations**: Get outfit suggestions based on:
  - Where you're going
  - Current weather
  - What you haven't worn recently
  - Avoiding outfit repeats at the same location
- **New Combinations**: Discover untried outfit combinations from your existing wardrobe
- **Purchase Suggestions**: Get recommendations for new items that would complement your wardrobe

### Analytics & Insights
- **Wear Statistics**: See which items you wear most/least
- **Wardrobe Gaps**: Identify missing categories or colors
- **Location History**: Track outfit variety for each place you visit
- **Repeat Alerts**: Know when you've worn the same outfit too many times to a location

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM for database operations
- **SQLite** - Database (easily swappable to PostgreSQL)
- **OpenAI Vision API** - AI-powered image analysis

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **React Router** - Navigation

## Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+
- (Optional) OpenAI API key for AI features

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Edit .env to add your OpenAI API key (optional)

# Run the server
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login and get token
- `GET /api/auth/me` - Get current user

### Clothing Items
- `GET /api/clothing` - List all items
- `POST /api/clothing` - Create item manually
- `POST /api/clothing/upload` - Upload and analyze single item
- `POST /api/clothing/upload-wardrobe` - Scan wardrobe photo for multiple items

### Outfits
- `GET /api/outfits` - List saved outfits
- `POST /api/outfits` - Create outfit from items
- `POST /api/outfits/from-photo` - Create outfit from photo

### Outfit Logs
- `GET /api/logs` - Get wear history
- `POST /api/logs` - Log an outfit
- `POST /api/logs/quick` - Quick log with photo
- `GET /api/logs/calendar` - Calendar view
- `GET /api/logs/stats` - Wear statistics

### Locations
- `GET /api/locations` - List saved locations
- `POST /api/locations` - Add new location
- `GET /api/locations/{id}/history` - Outfit history at location
- `GET /api/locations/{id}/repeat-analysis` - Repeat wear analysis

### AI Suggestions
- `POST /api/suggestions` - Get outfit suggestions
- `GET /api/suggestions/wardrobe-insights` - Get wardrobe analytics
- `GET /api/suggestions/purchase-suggestions` - Get shopping recommendations
- `GET /api/suggestions/new-combinations` - Get untried outfit ideas

## Mobile-First Design

The app is designed with a mobile-first approach, featuring:
- Bottom navigation for easy thumb access
- Touch-friendly buttons and interactions
- Camera integration for quick photo capture
- Responsive layout that works on all screen sizes

## Future Enhancements

- Social features (share outfits, get feedback)
- Weather API integration for automatic suggestions
- Calendar integration for upcoming events
- Clothing care reminders (wash, dry clean)
- Budget tracking for wardrobe purchases
- Virtual try-on with AI

## License

MIT
