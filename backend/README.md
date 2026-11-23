# 🎓 CoursePilot — Backend API

> **CoursePilot** là nền tảng kết nối học viên với các trung tâm đào tạo. Backend cung cấp RESTful API đầy đủ cho việc quản lý khóa học, đặt lịch, thanh toán, chat AI và nhiều tính năng khác.

---

## 📑 Mục lục

- [Giới thiệu](#-giới-thiệu)
- [Tính năng chính](#-tính-năng-chính)
- [Tech Stack](#-tech-stack)
- [Kiến trúc dự án](#-kiến-trúc-dự-án)
- [Cài đặt & Chạy dự án](#-cài-đặt--chạy-dự-án)
- [Biến môi trường](#-biến-môi-trường)
- [API Endpoints](#-api-endpoints)
- [Xác thực](#-xác-thực)
- [Real-time (Socket.io)](#-real-time-socketio)
- [Tích hợp AI (Gemini + RAG)](#-tích-hợp-ai-gemini--rag)
- [Thanh toán MoMo](#-thanh-toán-momo)
- [Deployment](#-deployment)

---

## 🌟 Giới thiệu

CoursePilot Backend là một REST API server được xây dựng bằng **Node.js + Express**, kết nối với **MySQL** (qua Railway) và **Supabase** (cho vector search / RAG). Hệ thống hỗ trợ:

- Xác thực bằng **JWT** và **Google OAuth 2.0**
- Chat AI tư vấn khóa học sử dụng **Gemini 2.5 Flash + RAG**
- Thanh toán trực tuyến qua **MoMo**
- Thông báo real-time qua **Socket.io**
- Upload ảnh lên **Supabase Storage**
- Tài liệu API tự động bằng **Swagger UI**

---

## ✨ Tính năng chính

| Tính năng | Mô tả |
|-----------|-------|
| 🔐 **Xác thực** | Đăng ký/đăng nhập email-password, Google OAuth, OTP qua email |
| 🏫 **Trung tâm** | CRUD trung tâm đào tạo, quản lý thông tin |
| 📚 **Khóa học** | Tạo, cập nhật, tìm kiếm, phân loại khóa học theo danh mục |
| 🗓️ **Lịch học** | Quản lý lịch học, nhắc nhở tự động qua cron job |
| 💳 **Thanh toán** | Tích hợp MoMo ATM, xác minh callback, hoàn tiền |
| 📋 **Gói dịch vụ** | Quản lý plan, subscription cho trung tâm |
| 👥 **Follow** | Người dùng theo dõi trung tâm |
| 📢 **Thông báo** | Hệ thống notification real-time qua Socket.io |
| 🤖 **Chat AI** | Tư vấn khóa học bằng Gemini + RAG (Supabase Vector DB) |
| 📊 **Thống kê** | Dashboard thống kê doanh thu, người dùng, khóa học |
| 📧 **Email** | Gửi email xác thực, OTP qua Resend |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js (CommonJS) |
| **Framework** | Express.js v5 |
| **Database** | MySQL 2 (hosted on Railway) |
| **Vector DB** | Supabase (pgvector cho RAG) |
| **Storage** | Supabase Storage |
| **AI** | Google Gemini 2.5 Flash + text-embedding-004 |
| **Auth** | JWT, Passport.js, Google OAuth 2.0 |
| **Payment** | MoMo Payment Gateway |
| **Real-time** | Socket.io v4 |
| **Email** | Resend |
| **File Upload** | Multer v2 |
| **Docs** | Swagger UI + swagger-jsdoc |
| **Validation** | express-validator |

---

## 📁 Kiến trúc dự án

```
backend/
├── server.js                   # Entry point, khởi tạo Express + Socket.io
├── config/
│   ├── db.js                   # MySQL connection pool
│   ├── firebase.js             # Firebase Admin SDK
│   ├── passport.js             # Google OAuth strategy
│   ├── supabase.js             # Supabase client
│   └── swagger.js              # Swagger configuration
├── controllers/                # Xử lý logic request/response
│   ├── auth.controller.js
│   ├── category.controller.js
│   ├── center.controller.js
│   ├── chatController.js
│   ├── course.controller.js
│   ├── follow.controller.js
│   ├── knowledgeController.js
│   ├── lead.controller.js
│   ├── notification.controller.js
│   ├── payment.controller.js
│   ├── plan.controller.js
│   ├── schedule.controller.js
│   ├── statistics.controller.js
│   ├── subscription.controller.js
│   └── user.controller.js
├── middlewares/                # Middleware: auth, validation, upload
│   ├── auth.middleware.js
│   ├── auth.validator.js
│   ├── category.validator.js
│   ├── center.validator.js
│   ├── course.validator.js
│   ├── follow.validator.js
│   ├── payment.validator.js
│   ├── schedule.validator.js
│   └── upload.middleware.js
├── models/                     # Database query functions (raw SQL)
│   ├── category.model.js
│   ├── center.model.js
│   ├── course.model.js
│   ├── follow.model.js
│   ├── lead.model.js
│   ├── notification.model.js
│   ├── payment.model.js
│   ├── plan.model.js
│   ├── schedule.model.js
│   ├── subscription.model.js
│   └── user.model.js
├── routes/                     # Định nghĩa route (kèm Swagger JSDoc)
│   ├── auth.route.js
│   ├── category.route.js
│   ├── center.route.js
│   ├── chat.route.js
│   ├── course.route.js
│   ├── follow.route.js
│   ├── knowledge.route.js
│   ├── lead.route.js
│   ├── notification.route.js
│   ├── payment.route.js
│   ├── plan.route.js
│   ├── schedule.route.js
│   ├── statistics.route.js
│   ├── subscription.route.js
│   └── user.route.js
├── services/                   # Business logic & external services
│   ├── dbTest.js
│   ├── emailService.js         # Gửi email qua Resend
│   ├── geminiService.js        # Gemini AI + RAG
│   ├── imageUploadService.js   # Upload ảnh lên Supabase
│   ├── momoService.js          # MoMo payment integration
│   ├── ragService.js           # Retrieval-Augmented Generation
│   ├── scheduleNotificationCron.js  # Nhắc lịch học tự động
│   └── subscriptionCron.js    # Kiểm tra & cập nhật subscription
├── utils/
│   └── socketManager.js        # Quản lý Socket.io
├── migrations/                 # Database migration scripts
├── .env                        # Biến môi trường (không commit)
└── package.json
```

---

## 🚀 Cài đặt & Chạy dự án

### Yêu cầu

- **Node.js** >= 18.x
- **npm** >= 9.x
- Tài khoản **MySQL** (hoặc Railway)
- Tài khoản **Supabase**
- API key **Google Gemini**

### Các bước cài đặt

```bash
# 1. Clone repository
git clone https://github.com/CoursePilot/SWD-BE.git
cd SWD-BE/backend

# 2. Cài đặt dependencies
npm install

# 3. Tạo file .env từ mẫu
cp .env.example .env
# Chỉnh sửa .env với thông tin của bạn

# 4. Chạy server (development)
npm run dev:server

# 5. Chạy server (production)
npm start
```

> Server mặc định chạy tại `http://localhost:3000`  
> Swagger UI: `http://localhost:3000/docs`

---

## 🔧 Biến môi trường

Tạo file `.env` ở thư mục `backend/` với các biến sau:

```env
# ─── Database (MySQL) ───────────────────────────────
DB_HOST=your_mysql_host
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=studyportal

# ─── Google OAuth ───────────────────────────────────
GG_CLIENT_ID=your_google_client_id
GG_CLIENT_SECRET=your_google_client_secret

# Google OAuth cho Android
GG_CLIENT_ID_ANDROID=your_android_client_id
GG_CLIENT_SECRET_ANDROID=

# ─── Session & JWT ──────────────────────────────────
SESSION_SECRET=your_session_secret
JWT_SECRET=your_jwt_secret

# ─── Server ─────────────────────────────────────────
PORT=3000
SERVER_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:5173

# ─── Supabase ───────────────────────────────────────
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# ─── Email (Resend) ─────────────────────────────────
RESEND_API_KEY=re_your_api_key
EMAIL_FROM="CoursePilot OTP <no-reply@yourdomain.com>"

# ─── MoMo Payment ───────────────────────────────────
MOMO_PARTNER_CODE=MOMO
MOMO_ACCESS_KEY=your_momo_access_key
MOMO_SECRET_KEY=your_momo_secret_key
MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_QUERY_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/query
MOMO_REFUND_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/refund
MOMO_REDIRECT_URL=https://yourdomain.com/api/v1/payments/momo/redirect
MOMO_IPN_URL=https://yourdomain.com/api/v1/payments/momo/callback

# ─── Gemini AI ──────────────────────────────────────
GEMINI_API_KEY=your_gemini_api_key
```

> [!CAUTION]
> **Không bao giờ commit file `.env`** lên repository. Đảm bảo `.env` đã được thêm vào `.gitignore`.

---

## 📡 API Endpoints

Tất cả API đều có prefix `/api/v1`. Xem tài liệu đầy đủ tại Swagger UI: `http://localhost:3000/docs`

| Module | Base Route | Mô tả |
|--------|-----------|-------|
| Auth | `/api/v1/auth` | Đăng ký, đăng nhập, Google OAuth, OTP |
| Users | `/api/v1/users` | Quản lý người dùng, hồ sơ cá nhân |
| Centers | `/api/v1/centers` | CRUD trung tâm đào tạo |
| Courses | `/api/v1/courses` | CRUD khóa học |
| Categories | `/api/v1/categories` | Danh mục khóa học |
| Schedules | `/api/v1/schedules` | Lịch học |
| Plans | `/api/v1/plans` | Gói dịch vụ |
| Subscriptions | `/api/v1/subscriptions` | Đăng ký gói dịch vụ |
| Payments | `/api/v1/payments` | Thanh toán MoMo |
| Follows | `/api/v1/follows` | Follow trung tâm |
| Leads | `/api/v1/leads` | Tiếp nhận học viên tiềm năng |
| Notifications | `/api/v1/notifications` | Thông báo |
| Chat | `/api/v1/chat` | Chat AI tư vấn |
| Knowledge | `/api/v1/knowledge` | Quản lý knowledge base (RAG) |
| Statistics | `/api/v1/statistics` | Thống kê & báo cáo |

---

## 🔐 Xác thực

API sử dụng **Bearer JWT Token**. Thêm header sau vào mỗi request cần xác thực:

```
Authorization: Bearer <your_jwt_token>
```

### Luồng xác thực

```
┌─────────────┐    POST /auth/login     ┌──────────────┐
│   Client    │ ───────────────────────▶ │   Server     │
│             │ ◀─────────────────────── │              │
│             │      { token: JWT }      │              │
│             │                          │              │
│             │  GET /api/... + Bearer   │              │
│             │ ───────────────────────▶ │  Verify JWT  │
│             │ ◀─────────────────────── │              │
└─────────────┘        Response          └──────────────┘
```

### Phương thức đăng nhập

- **Email/Password** — `POST /api/v1/auth/login`
- **Google OAuth** — `GET /api/v1/auth/google`
- **Google ID Token (Android)** — `POST /api/v1/auth/google/id-token`

---

## 🔌 Real-time (Socket.io)

Server hỗ trợ kết nối WebSocket qua Socket.io tại cùng port với HTTP server.

```javascript
// Client kết nối
const socket = io('http://localhost:3000', {
  auth: { token: 'your_jwt_token' }
});

// Nhận thông báo
socket.on('notification', (data) => {
  console.log('New notification:', data);
});

// Nhận nhắc lịch học
socket.on('schedule_reminder', (data) => {
  console.log('Schedule reminder:', data);
});
```

---

## 🤖 Tích hợp AI (Gemini + RAG)

Hệ thống sử dụng **Retrieval-Augmented Generation (RAG)** để tư vấn khóa học chính xác:

```
User Question
     │
     ▼
┌─────────────────┐
│  text-embedding │  ← Google text-embedding-004
│  -004 Embedding │
└────────┬────────┘
         │ Query Vector
         ▼
┌─────────────────┐
│   Supabase      │  ← pgvector cosine similarity search
│   Vector DB     │
│  (match_count=3)│
└────────┬────────┘
         │ Retrieved Context
         ▼
┌─────────────────┐
│  Gemini 2.5     │  ← Sinh câu trả lời dựa trên context
│  Flash          │
└────────┬────────┘
         │
         ▼
   AI Response
```

**Endpoints liên quan:**
- `POST /api/v1/chat` — Gửi câu hỏi, nhận câu trả lời AI
- `POST /api/v1/knowledge` — Thêm nội dung vào knowledge base
- `GET /api/v1/knowledge` — Xem knowledge base

---

## 💳 Thanh toán MoMo

Tích hợp **MoMo ATM** (môi trường test) với đầy đủ luồng:

```
Client → POST /payments/momo/create
              │
              ▼
         MoMo Gateway
              │ (redirect)
              ▼
         GET /payments/momo/redirect   ← User redirect sau thanh toán
              │
              ▼
         POST /payments/momo/callback  ← IPN callback từ MoMo
```

**Chức năng hỗ trợ:**
- ✅ Tạo link thanh toán
- ✅ Xác minh callback (HMAC SHA256)
- ✅ Kiểm tra trạng thái giao dịch
- ✅ Hoàn tiền

> [!NOTE]
> Hiện tại sử dụng MoMo **sandbox/test environment**. Thay đổi `MOMO_ENDPOINT` sang production endpoint khi go-live.

---

## 🚢 Deployment

Dự án được deploy trên **Railway**:

- **API Base URL:** `https://studyportal.up.railway.app`
- **Swagger Docs:** `https://studyportal.up.railway.app/docs`

### Deploy thủ công lên Railway

```bash
# Đảm bảo đã cài Railway CLI
npm install -g @railway/cli

# Login và deploy
railway login
railway up
```

---

## 🤝 Đóng góp

1. Fork repository
2. Tạo branch mới: `git checkout -b feature/ten-tinh-nang`
3. Commit thay đổi: `git commit -m "feat: thêm tính năng X"`
4. Push lên branch: `git push origin feature/ten-tinh-nang`
5. Mở Pull Request vào branch `Develop`

---

## 👨‍💻 Nhóm phát triển

**CoursePilot Team** — SWD Project

---

<div align="center">
  <sub>Built with ❤️ using Node.js, Express, MySQL, Supabase & Google Gemini</sub>
</div>
