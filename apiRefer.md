# SentinelAI - API Reference

## Base URL

```
http://localhost:8082/api
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

**Token Expiry:** 24 hours

---

## 🔐 Authentication Endpoints

### Login

Get JWT token for authenticated user.

```http
POST /api/auth/login
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "username": "admin",
  "roles": ["ROLE_ADMIN", "ROLE_USER"]
}
```

**Error Responses:**
- `400 Bad Request` - Invalid credentials
- `500 Internal Server Error` - Authentication failed

---

### Validate Token

Check if JWT token is valid.

```http
GET /api/auth/validate
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "valid": true
}
```

---

## 📊 Incident Endpoints

### Get All Incidents

Retrieve list of all incidents.

```http
GET /api/incidents
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "summary": "Classification: Normal Activity...",
    "riskLevel": "Low",
    "classification": "Normal Activity",
    "createdAt": "2026-03-14T19:40:41.472972",
    "reportFilePath": "incidents-reports/...",
    "camera": "CAM-06",
    "zone": "Zone F",
    "confidence": "93.9%",
    "riskScore": "6.0/10",
    "processingTime": "1.4s",
    "framesAnalyzed": 4
  }
]
```

---

### Get Incident by ID

Retrieve detailed incident information.

```http
GET /api/incidents/{id}
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "classification": "Suspicious Activity",
  "riskLevel": "High",
  "createdAt": "2026-03-14T19:40:41.472972",
  "summary": "Video: security_cam.mp4",
  "camera": "CAM-06",
  "zone": "Zone F",
  "confidence": "93.9%",
  "riskScore": "6.0/10",
  "processingTime": "1.4s",
  "framesAnalyzed": 4,
  "fullReport": "SUMMARY:\nAI analysis of video...",
  "detailedReport": "SUMMARY:\nAI analysis of video..."
}
```

---

### Get Incident Frames

Retrieve evidence photos for incident (Medium/High risk only).

```http
GET /api/incidents/{id}/frames
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
[
  {
    "frameIndex": 0,
    "base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "createdAt": "2026-03-14T19:40:41.472972",
    "filePath": "C:/.../incident-frames/1/frame_0.jpg"
  }
]
```

**Response (200 OK - No frames):**
```json
[]
```

---

### Analyze Images

Upload and analyze image files.

```http
POST /api/incidents/analyze
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Request Body (Form Data):**
```
files: [image1.jpg, image2.jpg, ...]
```

**Response (200 OK):**
```json
{
  "id": 1,
  "report": "Classification: Normal Activity...",
  "classification": "Normal Activity",
  "riskLevel": "Low",
  "createdAt": "2026-03-14T19:40:41.472972"
}
```

**Error Responses:**
- `400 Bad Request` - No files uploaded or invalid file type
- `500 Internal Server Error` - Analysis failed

---

### Analyze Video

Upload and analyze video file.

```http
POST /api/incidents/analyze-video
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Request Body (Form Data):**
```
video: security_footage.mp4
```

**Response (200 OK):**
```json
{
  "id": 1,
  "videoName": "security_footage.mp4",
  "savedPath": "C:/.../uploads/security_footage.mp4",
  "classification": "Suspicious Activity",
  "riskLevel": "High",
  "framesStored": true
}
```

**Error Responses:**
- `400 Bad Request` - No video uploaded or invalid file type
- `500 Internal Server Error` - Processing failed

---

## 📹 Camera Endpoints

### Get All Cameras

Retrieve list of all configured cameras.

```http
GET /api/cameras
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
[
  {
    "id": "CAM-01",
    "label": "North Corridor",
    "sector": "Alpha",
    "status": "active",
    "isCapturing": false,
    "currentFrame": null
  }
]
```

---

### Get Camera Stream

Get stream information for specific camera.

```http
GET /api/cameras/{id}/stream
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "cameraId": "CAM-01",
  "streamType": "mjpeg",
  "url": "/api/cameras/CAM-01/mjpeg",
  "fps": 30,
  "resolution": "1920x1080"
}
```

---

### Start Camera Capture

Start capturing frames from camera.

```http
POST /api/cameras/{id}/start
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "status": "started",
  "cameraId": "CAM-01"
}
```

---

### Stop Camera Capture

Stop capturing frames from camera.

```http
POST /api/cameras/{id}/stop
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "status": "stopped",
  "cameraId": "CAM-01"
}
```

---

### Get Camera Frame

Get current frame from camera (base64 encoded).

```http
GET /api/cameras/{id}/frame
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "cameraId": "CAM-01",
  "timestamp": 1773490123456,
  "frame": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Response (200 OK - Not capturing):**
```json
{
  "cameraId": "CAM-01",
  "frame": null
}
```

---

## 📁 File Upload Specifications

### Image Upload

**Accepted Formats:** JPEG, JPG, PNG, WebP  
**Max File Size:** 200MB  
**Validation:** MIME type, file extension, magic bytes

### Video Upload

**Accepted Formats:** MP4, AVI, MOV, MKV, WebM  
**Max File Size:** 200MB  
**Validation:** MIME type, file extension, magic bytes  
**Processing:** Extracts 1 frame at 50% position

---

## 🔒 Rate Limiting

| Endpoint Type | Limit | Response on Exceed |
|---------------|-------|-------------------|
| Upload (`/analyze`, `/analyze-video`) | 10 req/min | `429 Too Many Requests` |
| Read (GET endpoints) | 30 req/min | `429 Too Many Requests` |
| Auth (`/auth/login`) | 10 req/min | `429 Too Many Requests` |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 5
X-RateLimit-Reset: 1773490200
```

---

## ⚠️ Error Codes

| HTTP Status | Meaning | Common Causes |
|-------------|---------|---------------|
| `200 OK` | Success | Request processed successfully |
| `400 Bad Request` | Invalid request | Missing parameters, invalid file type |
| `401 Unauthorized` | Authentication required | Missing or invalid JWT token |
| `403 Forbidden` | Access denied | Insufficient permissions |
| `404 Not Found` | Resource not found | Invalid incident ID or camera ID |
| `429 Too Many Requests` | Rate limit exceeded | Too many requests in time window |
| `500 Internal Server Error` | Server error | LM Studio unavailable, FFmpeg error |
| `503 Service Unavailable` | Service down | Database or Redis connection failed |

---

## 🧪 Example Requests

### cURL Examples

**Login:**
```bash
curl -X POST http://localhost:8082/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

**Get Incidents:**
```bash
curl -X GET http://localhost:8082/api/incidents \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Upload Image:**
```bash
curl -X POST http://localhost:8082/api/incidents/analyze \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@/path/to/image.jpg"
```

**Upload Video:**
```bash
curl -X POST http://localhost:8082/api/incidents/analyze-video \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "video=@/path/to/video.mp4"
```

---

## 📝 Notes

1. **Token Management:** Tokens expire after 24 hours. Implement token refresh logic.
2. **File Validation:** All uploads are validated for MIME type, extension, and magic bytes.
3. **Evidence Retention:** Medium/High risk incidents retain evidence for 30 days.
4. **Frame Extraction:** Video processing extracts 1 frame at 50% position for efficiency.
5. **CORS:** Configured for `localhost:5173` and `localhost:4173` only.

---

**API Version:** 1.0  
**Last Updated:** March 16, 2026
