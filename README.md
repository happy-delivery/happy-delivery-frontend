# Happy Delivery

A peer-to-peer delivery platform where anyone can request delivery services or become a delivery partner.

## Overview

Happy Delivery is a SaaS platform that enables users to:
- Request delivery of items from one location to another
- Become delivery partners and earn by fulfilling delivery requests
- Track deliveries in real-time
- Communicate through in-app chat
- Negotiate payment directly

One user can be both a sender and a delivery partner - no need to switch accounts.

## Technology Stack

### Frontend
- React.js (JavaScript)
- React Router for navigation
- Context API for state management
- Tailwind CSS for styling
- Leaflet.js with OpenStreetMap for maps
- Socket.io-client for real-time updates

### Backend
- Node.js with Express.js
- Socket.io for real-time communication
- Multer for image uploads
- Supabase Admin SDK

### Database & Services
- Supabase PostgreSQL (database)
- Supabase Authentication
- Supabase Storage (images)
- Supabase Real-time subscriptions

### Maps
- Leaflet.js with OpenStreetMap tiles (free)
- Nominatim API for geocoding

### Hosting
- Vercel (frontend and backend)

## Project Structure

```
Happy-Delivery/
├── frontend/              # React application
│   ├── public/
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── pages/        # Page components
│   │   ├── contexts/     # React contexts
│   │   ├── utils/        # Utility functions
│   │   └── App.jsx       # Main app component
│   └── package.json
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Supabase account
- Git

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file with Supabase configuration:
```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_BACKEND_URL=http://localhost:5000
```

4. Start development server:
```bash
npm start
```

Frontend runs on `http://localhost:3000`

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

4. Start server:
```bash
npm start
```

Backend runs on `http://localhost:5000`

### Database Setup

1. Go to Supabase Dashboard
2. Navigate to SQL Editor
3. Run the SQL script from `database/schema.sql`
4. Create storage bucket named `delivery-images` in Storage section
5. Configure bucket policies as specified in schema.sql

## Features

### Core Features
- User authentication (signup/login)
- Dual role system (sender & delivery partner)
- Real-time delivery request matching
- Interactive map with location selection
- Live location tracking
- Image verification (item pickup & delivery)
- Real-time chat between sender and partner
- Payment negotiation (peer-to-peer)
- Delivery status tracking
- Notifications

### Advanced Features
- Cancellation mechanisms (before/after acceptance)
- Emergency cancellation (during delivery)
- Timeout mechanisms (auto-cancellation)
- Dispute resolution
- Rating & feedback system
- Rewards program
- User profiles

## Development Workflow

1. Each new file must be committed separately
2. Follow Figma design strictly
3. Use only yellow color palette from design
4. No emoji characters anywhere
5. JavaScript only (no TypeScript)

## Deployment

### Frontend Deployment (Vercel)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
cd frontend
vercel --prod
```

### Backend Deployment (Vercel)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
cd backend
vercel --prod
```

3. Configure environment variables in Vercel Dashboard:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PORT=5000`

## Testing

### Manual Testing
- Test all user flows end-to-end
- Verify responsive design (mobile/tablet/desktop)
- Test real-time features (chat, tracking)
- Verify all cancellation scenarios
- Test notification delivery

## API Endpoints

See `workflow.md` for complete API documentation.

## System Architecture

See `architecture.md` for detailed system design and database schema.

## License

This project is proprietary software. All rights reserved.

See [LICENSE](LICENSE) file for full terms and conditions.

**Summary:**
- Copying source code, architecture, or database schema is strictly prohibited
- Use in any project (commercial or non-commercial) is prohibited
- Viewing for educational purposes only
- Contact developer for licensing inquiries

## Developer

**Lavesh Patil**
- Email: lavesh.patil@zohomail.in
- GitHub: https://github.com/lavesh00/Happy-Delivery
