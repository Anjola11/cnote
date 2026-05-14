# Cnote — Where thoughts find their home.

[![Vercel](https://img.shields.io/badge/Frontend-Vercel-black?style=flat-square&logo=vercel)](https://usecnote.vercel.app)
[![Heroku](https://img.shields.io/badge/Backend-Heroku-430098?style=flat-square&logo=heroku)](https://cnote-8f598c8d0d2d.herokuapp.com)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/Framework-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)

**Cnote** is a premium, distraction-free writing platform designed for creative thinkers, developers, and spiritual seekers. It combines the power of a rich-text editor with a minimalist, high-aesthetic interface to provide a sanctuary for your digital notes.

![Landing Page Mockup](https://usecnote.vercel.app/og-image.png)

## ✨ Key Features

- **Sophisticated Editor**: Powered by Tiptap, supporting rich formatting, interactive code blocks with syntax highlighting, and custom scripture integration.
- **Live Scripture Integration**: Search and embed Bible verses directly into your notes with beautiful formatting.
- **Category-Based Organization**: Seamlessly toggle between Programming, Spiritual, and General categories to keep your thoughts structured.
- **Public Note Sharing**: One-click sharing generates a beautiful, read-only public page for your notes.
- **Intelligent Recovery**: A built-in Bin system allows you to restore accidentally deleted notes within 30 days.
- **Adaptive Theme Engine**: Deep dark mode support that responds to your browser preferences or manual overrides.
- **Performance Optimized**: Built with TanStack Query for efficient data fetching and zero-lag state management.

## 🛠 Tech Stack

### Frontend
- **Framework**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Type Safety**: [TypeScript](https://www.typescriptlang.org/)
- **Editor**: [Tiptap](https://tiptap.dev/) (Headless Editor Framework)
- **Animations**: [GSAP](https://greensock.com/gsap/) (GreenSock Animation Platform)
- **State Management**: [TanStack Query v5](https://tanstack.com/query/latest)
- **Styling**: Vanilla CSS (Modern Design System)
- **Icons**: [Font Awesome](https://fontawesome.com/)

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
- **ORM/Schema**: [SQLModel](https://sqlmodel.tiangolo.com/) (Pydantic + SQLAlchemy)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **Authentication**: JWT (Access/Refresh Token strategy) with HTTP-only Cookies
- **Media**: [Cloudinary](https://cloudinary.com/) (Image hosting and processing)
- **Email**: [Brevo](https://www.brevo.com/) (Transactional emails and OTP verification)
- **Caching/Limiting**: [Redis](https://redis.io/)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL
- Redis

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Anjola11/cnote.git
   cd cnote
   ```

2. **Backend Setup**:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Frontend Setup**:
   ```bash
   cd ../frontend
   npm install
   ```

4. **Environment Variables**:
   Create a `.env` file in the `backend` directory and a `.env.local` in the `frontend` directory based on the provided examples.

5. **Run the application**:
   ```bash
   # Backend
   uvicorn src:app --reload

   # Frontend
   npm run dev
   ```

## 📐 Architecture

Cnote follows a modern decoupled architecture:
- **FastAPI** handles the business logic, authentication, and database interactions, serving a RESTful API.
- **React (Vite)** provides a highly responsive, animated UI that interacts with the backend via a standardized service layer.
- **SQLModel** ensures strict type safety across the entire data lifecycle, from database records to API responses.

## 🔒 Security
- **HTTP-only Cookies**: Protects user sessions from XSS attacks.
- **Rate Limiting**: Integrated Redis-based limiting on sensitive endpoints (Login, Signup, OTP).
- **CORS Protection**: Strict origin validation for production environments.

## 📄 License
This project is licensed under the MIT License.

---

Built with ❤️ by [Anjola](https://github.com/Anjola11)
