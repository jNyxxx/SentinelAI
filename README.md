# 🛡️ SentinelAI

**AI-Powered Security Monitoring System**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Java](https://img.shields.io/badge/Java-21-orange.svg)](https://openjdk.java.net/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4-brightgreen.svg)](https://spring.io/projects/spring-boot)

A full-stack **AI-powered security monitoring system** that analyzes video uploads and images to detect suspicious activity. SentinelAI uses local AI inference (LM Studio with Qwen3-VL vision model) for fully offline, privacy-focused processing.

---

## ✨ Features

### 🎯 Core Capabilities

- **Real-Time Video Analysis** - Live webcam monitoring with AI-powered threat detection
- **Incident Detection** - Automatic classification of suspicious activities (High/Medium/Low risk)
- **Smart Alerts** - Instant notifications with risk-based prioritization
- **Evidence Management** - Automatic frame extraction and secure storage
- **Risk Trend Analytics** - Visual charts showing incident patterns over time
- **Offline AI Inference** - 100% local processing, no cloud dependencies

### 🔔 Notification System

- Real-time notification bell with unread count
- Dismissible alerts with risk color coding
- Cross-tab synchronization
- Email and SMS alert preferences (configurable)

### 📊 Dashboard

- Total incidents counter with live updates
- Active alerts tracking (last 60 minutes)
- Risk level trend charts (1H/24H/7D views)
- Recent incidents table with classification

### 🎥 Live Monitor

- Webcam integration with auto-scan (10-second intervals)
- Real-time AI analysis overlay
- Immediate alerts panel
- System status monitoring

### ⚙️ Settings

- **Account & Security**
  - Profile management (name, email)
  - Password change
  - Session timeout configuration
  
- **Notification Preferences**
  - Alert thresholds (High/Medium risk levels)
  - Email notifications
  - SMS alerts
  - Real-time preview updates

---

## 🏗️ Architecture

```
┌─────────────────┐      ┌─────────────────┐
│   Frontend      │─────▶│    Backend      │
│  React + Vite   │      │  Spring Boot 3  │
│  TailwindCSS    │      │  Java 21        │
└─────────────────┘      └────────┬────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
              ┌──────────┐ ┌────────── ┌──────────┐
              │PostgreSQL│ │  Redis   │ │ LM Studio│
              │ Database │ │  Cache   │ │   (AI)   │
              └────────── └──────────┘ ──────────┘
```

### Frame Lifecycle

```
Video Upload → FFmpeg extracts frames → Redis cache (TTL: 30min)
                                           ↓
                              LM Studio analyzes frames
                                           ↓
                    ┌──────────────────────┴──────────────┐
                    ▼                                     ▼
         High/Medium Risk                         Low/Unknown Risk
         Promote to disk storage                  Evict from Redis
         (30-day retention)                       No persistence
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, React Router v6, Vite 5, TailwindCSS 3, Recharts, Lucide Icons |
| **Backend** | Spring Boot 3.4.3, Java 21, Maven, Lombok |
| **Database** | PostgreSQL (persistent storage), Redis (frame caching) |
| **AI/ML** | LM Studio API, Qwen3-VL-4B vision model |
| **Video Processing** | FFmpeg (via net.bramp.ffmpeg) |

---

## 📦 Installation

### Prerequisites

- **Java 21** - [Download](https://openjdk.java.net/)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **PostgreSQL** - [Download](https://www.postgresql.org/)
- **Redis** - [Download](https://redis.io/)
- **LM Studio** - [Download](https://lmstudio.ai/) with `qwen3-vl-4b` model
- **FFmpeg** - [Download](https://ffmpeg.org/)

### 1. Clone the Repository

```bash
git clone https://github.com/jNyxxx/SentinelAI.git
cd SentinelAI
```

### 2. Frontend Setup

```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Build for production
npm run build
```

### 3. Backend Setup

```bash
cd backend/sentinelai

# Configure environment
cp .env.example .env
# Edit .env with your database credentials and API settings

# Run with Maven wrapper
./mvnw spring-boot:run

# Or build JAR
./mvnw clean package
java -jar target/sentinelai-0.0.1-SNAPSHOT.jar
```

Backend runs on **http://localhost:8082**

---

## ⚙️ Configuration

### Environment Variables (`.env`)

```env
# Database
DB_URL=jdbc:postgresql://localhost:5432/sentinelai
DB_USERNAME=postgres
DB_PASSWORD=your_password

# AI Inference
LMSTUDIO_URL=http://localhost:1234/v1/chat/completions
LMSTUDIO_MODEL=qwen3-vl-4b

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# FFmpeg Path (Windows)
FFMPEG_PATH=C:/ffmpeg/bin/ffmpeg.exe
```

### LM Studio Setup

1. Download and install [LM Studio](https://lmstudio.ai/)
2. Download the `Qwen3-VL-4B` vision model
3. Start the local server on port `1234`
4. Ensure vision/model endpoint is enabled

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/incidents` | Retrieve all incidents |
| `GET` | `/api/incidents/{id}` | Retrieve incident with full report |
| `GET` | `/api/incidents/{id}/frames` | Retrieve evidence frames (High/Medium risk only) |
| `POST` | `/api/incidents/analyze` | Analyze uploaded image(s) |
| `POST` | `/api/incidents/analyze-video` | Analyze uploaded video file |
| `GET` | `/api/cameras` | Get list of available cameras |
| `POST` | `/api/cameras/webcam/register` | Register virtual webcam |
| `POST` | `/api/cameras/webcam/heartbeat` | Send webcam heartbeat |

---

## 🌐 Frontend Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Dashboard | System metrics, risk trends, recent incidents |
| `/live-monitor` | LiveMonitor | Live camera feeds, AI overlays, real-time alerts |
| `/video-uploads` | VideoUpload | Drag-drop upload, processing queue |
| `/incident-reports` | IncidentReports | Filter sidebar, incident card grid, export |
| `/incident/:id` | IncidentDetail | Single incident detail view |
| `/settings` | Settings | System configuration panels |

---

## 🎨 Design System

| Token | Value | Usage |
|-------|-------|-------|
| `bg-bg-primary` | `#0a0e1a` | Main background |
| `bg-bg-secondary` | `#0f1629` | Secondary areas |
| `bg-bg-card` | `#111827` | Card backgrounds |
| `accent-blue` | `#3b82f6` | Primary actions |
| `accent-red` | `#ef4444` | Danger/high risk |
| `accent-green` | `#10b981` | Success/low risk |
| `accent-orange` | `#f97316` | Warnings/medium risk |

**Fonts:** IBM Plex Sans, IBM Plex Mono, Rajdhani (via Google Fonts)

---

## 🧪 Testing

### Backend

```bash
cd backend/sentinelai
./mvnw test
```

### Frontend

```bash
npm run test
```

---

## 📂 Project Structure

```
sentinelai/
├── frontend/
│   ├── components/       # Reusable UI components
│   ├── pages/            # Route page components
│   ├── layouts/          # Layout wrappers
│   ├── utils/            # Utility functions
│   ├── services/         # API service layer
│   └── App.jsx           # Main routing component
├── backend/
│   └── sentinelai/
│       ├── controller/   # REST API endpoints
│       ├── service/      # Business logic layer
│       ├── repository/   # JPA data access
│       ├── domain/       # Entity classes
│       ├── config/       # Spring configuration
│       └── .env          # Environment variables
├── package.json          # Frontend dependencies
├── pom.xml               # Maven dependencies
└── README.md             # This file
```

---

## 🔒 Security Considerations

- **Local AI Inference** - All processing happens offline, no data sent to external APIs
- **Session Management** - Configurable timeout and concurrent session controls
- **Password Storage** - Hashed storage (use bcrypt in production)
- **Frame Retention** - High/Medium risk frames stored for 30 days, low risk evicted immediately

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code conventions
- Add tests for new features
- Update documentation as needed
- Use meaningful commit messages

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Qwen3-VL](https://qwenlm.github.io/) - Vision language model
- [LM Studio](https://lmstudio.ai/) - Local AI inference platform
- [Spring Boot](https://spring.io/projects/spring-boot) - Backend framework
- [React](https://reactjs.org/) - Frontend framework
- [TailwindCSS](https://tailwindcss.com/) - Utility-first CSS framework

---

## 📬 Contact

- **Repository:** [github.com/jNyxxx/SentinelAI](https://github.com/jNyxxx/SentinelAI)
- **Issues:** [GitHub Issues](https://github.com/jNyxxx/SentinelAI/issues)

---

<div align="center">

**Built with ❤️ for secure, privacy-focused monitoring**

[⬆ Back to Top](#-sentinelai)

</div>
