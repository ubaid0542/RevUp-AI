# Review App — React + Laravel

AI-powered Google Review Generator built with **React** (frontend) and **Laravel/PHP** (backend API).

## 🏗️ Project Structure

```
review-app/
├── frontend/           # React + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── SetupScreen.jsx      # Business setup form
│   │   │   ├── BusinessCard.jsx     # Business identity header
│   │   │   ├── QuestionSlider.jsx   # 6-question sliding form
│   │   │   ├── StarRating.jsx       # Interactive star ratings
│   │   │   └── ReviewResult.jsx     # Generated review + actions
│   │   ├── services/
│   │   │   └── reviewService.js     # Review generation (local + API)
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css                # Global design system
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── backend/            # Laravel PHP API
    ├── app/
    │   ├── Http/Controllers/
    │   │   ├── BusinessController.php
    │   │   └── ReviewController.php
    │   ├── Models/
    │   │   ├── Business.php
    │   │   └── Review.php
    │   ├── Providers/
    │   │   └── AppServiceProvider.php
    │   └── Services/
    │       └── ReviewGeneratorService.php
    ├── database/migrations/
    ├── routes/api.php
    └── composer.json
```

## 🚀 Quick Start

### Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

The React app runs at `http://localhost:5173` and works **standalone** — no backend needed!  
Review generation uses built-in Hinglish templates locally.

### Backend (Laravel — Optional)

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

The API runs at `http://localhost:8000`. The Vite dev server auto-proxies `/api` requests.

## ✨ Features

- **Setup Screen** — Upload logo + business name/type
- **6-Step Questionnaire** — Sliding star-rating form with particle effects
- **AI Review Generation** — Hinglish templates (local) or Laravel API
- **Copy & Post** — One-click copy and redirect to Google Reviews
- **Premium UI** — Dark glassmorphism theme with animations

## 🛠️ API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/businesses` | Create business profile |
| GET | `/api/businesses/{id}` | Get business details |
| PUT | `/api/businesses/{id}` | Update business |
| POST | `/api/businesses/{id}/logo` | Upload logo |
| POST | `/api/reviews/generate` | Generate review |
| POST | `/api/reviews/regenerate` | Regenerate review |
| GET | `/api/reviews/history/{businessId}` | Review history |

## 🎨 Tech Stack

- **Frontend**: React 18, Vite, Framer Motion
- **Backend**: Laravel 10, PHP 8.1+, SQLite
- **Styling**: Vanilla CSS with glassmorphism design system
