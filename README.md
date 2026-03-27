# SentinelAI
AI-powered security monitoring system with real-time video analysis, incident detection, and automated alerts. Built with React, Spring Boot, and local AI inference.

 SentinelAI Backend

![Java](https://img.shields.io/badge/Java-21-orange)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4.3-brightgreen)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue)
![Redis](https://img.shields.io/badge/Redis-Cache-red)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

SentinelAI Backend is a modular Spring Boot REST API powering an AI-driven surveillance system.  
It handles video ingestion, frame extraction, Redis-based frame caching, AI-based incident classification, evidence frame retention, and persistent risk reporting using a fully local inference pipeline.

This repository demonstrates clean backend architecture, service-layer design, caching strategies, and AI system integration.

---

  Core Capabilities

- RESTful API for incident management
- Video frame extraction via FFmpeg
- Redis-powered frame caching during AI processing
- AI-powered classification (Normal Activity / Suspicious Activity)
- Risk level computation (Low / Medium / High)
- Evidence frame retention — High/Medium risk frames stored permanently for 30 days
- Scheduled auto-cleanup — expired frames deleted every midnight
- PostgreSQL persistence layer
- Local vision model inference (LM Studio)
- Fully offline AI processing — no data leaves your machine

---

  Architecture Overview

 System Flow

```
Client (Frontend / Postman)
        ↓
REST Controller Layer
        ↓
Service Layer (Business Logic)
        ↓
Frame Cache Service → Redis (temporary frame storage)
        ↓
AI Integration Layer (LM Studio API)
        ↓
Frame Cleanup Service → Permanent Disk (High/Medium risk only)
        ↓
PostgreSQL Database
```

 Frame Lifecycle

```
Video Uploaded
      ↓
FFmpeg extracts frames → temp-frames/
      ↓
Frames cached in Redis [TTL: 30 minutes]
      ↓
temp-frames/ cleaned up
      ↓
LM Studio analyzes frames
      ↓
High/Medium Risk → frames promoted to incident-frames/{id}/
Low/Unknown Risk → frames evicted from Redis, nothing saved
      ↓
After 30 days → scheduled job deletes frames from disk + PostgreSQL
```

 High-Level Components

- Controller Layer → Handles HTTP requests and routes
- Service Layer → Business logic and orchestration
- FrameCacheService → Stores frames in Redis during AI processing
- FrameCleanupService → Promotes frames to disk, serves evidence, runs scheduled cleanup
- Repository Layer → Data persistence via JPA
- AI Service → Communicates with LM Studio via OpenAI-compatible API
- Video Processing Service → Frame extraction using FFmpeg

---

 🛠 Tech Stack

- Java 21
- Spring Boot 3.4.3
- PostgreSQL
- Redis (frame caching)
- FFmpeg (net.bramp.ffmpeg)
- LM Studio (Local AI Inference)
- Qwen3-VL-4B (Vision Language Model)
- Maven

---

  Project Structure

```
SentinelAI-Backend/
├── src/main/java/dev/SentinelAi/sentinelai/
│   ├── controller/
│   │   └── incidentController.java
│   ├── service/
│   │   ├── AI/
│   │   │   ├── AnalysisService.java
│   │   │   └── LMStudioServiceImpl.java
│   │   ├── impl/
│   │   │   ├── fileStorageServiceImpl.java
│   │   │   └── FrameCacheServiceImpl.java
│   │   ├── frameCacheService.java
│   │   ├── FrameCleanupService.java
│   │   ├── fileStorageService.java
│   │   └── VideoProcessingService.java
│   ├── repository/
│   │   ├── incidentsRepo.java
│   │   └── incidentFrameRepo.java
│   ├── domain/
│   │   └── entity/
│   │       ├── incidents.java
│   │       └── incidentFrame.java
│   ├── config/
│   │   └── RedisConfig.java
│   └── SentinelaiApplication.java
│
├── src/main/resources/
│   └── application.properties
│
├── incidents-reports/       ← generated report .txt files (gitignored)
├── incident-frames/         ← permanent evidence frames (gitignored)
├── uploads/                 ← uploaded videos (gitignored)
├── temp-frames/             ← temporary FFmpeg output (gitignored)
├── .env                     ← local environment config (gitignored)
├── .env.example
├── pom.xml
└── README.md
```

---

 ⚙️ Prerequisites

- Java 21
- Maven
- PostgreSQL
- Redis (running on port 6379)
- FFmpeg (installed at `C:/ffmpeg/bin/ffmpeg.exe`)
- LM Studio

---

  Setup Guide

 1️⃣ Clone Repository

```bash
git clone https://github.com/SoftwareReboot/SentinelAI.git
cd sentinelai
```

---

 2️⃣ Configure PostgreSQL

```sql
CREATE DATABASE sentineldb;
```

Hibernate will auto-create the following tables on first run:
- `incidents`
- `incident_frames`

---

 3️⃣ Install and Start Redis

Download Redis for Windows from:
```
https://github.com/microsoftarchive/redis/releases
```
Install the `.msi` and ensure it runs as a Windows service on port `6379`.

Verify Redis is running:
```bash
redis-cli ping
 Expected: PONG
```

---

 4️⃣ Configure LM Studio

- Install from https://lmstudio.ai
- Download `qwen3-vl-4b`
- Start local server on port `1234`
- Set context length ≥ 8192

---

 5️⃣ Environment Configuration

Create `.env` in the project root:

```
DB_URL=jdbc:postgresql://localhost:5432/yourdatabase_name
DB_USERNAME=your_username
DB_PASSWORD=your_password
LMSTUDIO_URL=http://localhost:1234/v1/chat/completions
LMSTUDIO_MODEL=qwen3-vl-4b
```

---

 6️⃣ Run Application

```bash
./mvnw spring-boot:run
```

Server runs on:
```
http://localhost:8082
```

---

  API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/incidents` | Retrieve all incidents |
| GET | `/api/incidents/{id}` | Retrieve incident with full report |
| GET | `/api/incidents/{id}/frames` | Retrieve evidence frames (High/Medium only) |
| POST | `/api/incidents/analyze` | Analyze uploaded image(s) |
| POST | `/api/incidents/analyze-video` | Analyze uploaded video file |

---

 🗂 Evidence Frame Policy

| Risk Level | Frame Behavior |
|------------|----------------|
| High | Cached in Redis → promoted to permanent disk storage |
| Medium | Cached in Redis → promoted to permanent disk storage |
| Low | Cached in Redis → evicted immediately, nothing saved |

Permanent frames are automatically deleted after 30 days via a scheduled job that runs every midnight.

 📄 License

MIT License

