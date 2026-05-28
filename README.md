# StudyHub 🎓 — AI-Powered Interactive Student Workspace

StudyHub is a premium, feature-rich collaborative student platform designed to elevate learning, note-taking, and peer-to-peer productivity. Driven by Google Gemini AI and real-time WebSocket communication, StudyHub automates study deck generation, structures exam quizzes, synchronizes tasks, and connects classmates globally.

### 🌐 Live Production Deployments
* **Live Web Application**: [studenthub-mauve.vercel.app](https://studenthub-mauve.vercel.app)
* **Real-Time Sockets Server**: [studenthub-sockets.onrender.com](https://studenthub-sockets.onrender.com)

---

## ✨ Features Suite

### 1. 🤖 AI Study Engines (Google Gemini 1.5 Flash)
* **AI Practice Tests**: Instantly generates 5-question multiple choice practice exams from your custom study logs or uploaded PDF documents. Sanitized answer streams prevent client-side snooping until exam submission.
* **AI Flashcard Decks**: Automatically parses note materials (including online PDF attachments) to generate a customized 3D flip study card deck.
* **AI Task Planner**: Generates systematic daily studying task checklists based on learning topics in one click.

### 2. ⚡ Real-Time Collaboration (Socket.IO Standalone)
* **Global Community Chat**: A unified, high-speed Discord-style global channel for all online StudyHub classmates.
* **Direct Private Messaging**: Exclusively registered student-to-student low-latency chat channels supporting note-sharing attachments.
* **Community Resources Board**: A public sharing wall where students can read, publish, and moderate peer-uploaded PDF documents and text logs.

### 3. ⏱️ Academic Workstation
* **Pomodoro Focus Timer**: Custom visual study countdown clock that records and persists completed focus session intervals.
* **Roster Security & Admin Panel**: Advanced administrative dashboard to monitor user activity, review flagged content reports, and block malicious accounts.
* **Password Self-Service Recovery**: Built-in dynamic Gmail OTP verification system allowing students to request password recovery codes, reset passwords, and regain access.

---

## 🛠️ Technology Stack
* **Frontend Core**: Next.js 16 (App Router), React 19, Tailwind CSS
* **Design & Icons**: Vanilla CSS & Lucide Icons (Glassmorphic dark design system)
* **Real-Time Layer**: Standalone Node.js / Express & Socket.IO server engine
* **Database & ORM**: Supabase PostgreSQL managed through Prisma ORM Client
* **Cloud Storage**: Supabase Storage Buckets (Public bucket: `notes`) for persistent PDF hosting
* **Email System**: Nodemailer SMTP integration for dynamic 6-digit verification OTPs
* **Security & Auth**: Secure HTTP-only cookies storing cryptographically signed JWT tokens (via `jose`)

---

## ⚙️ Environment Variables Setup

Create a `.env` file in the root of the project to run StudyHub locally:

```env
# PostgreSQL Database connection string (Supabase/Local Postgres)
DATABASE_URL="postgresql://postgres:[PASSWORD]@your-host.supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@your-host.supabase.co:5432/postgres"

# Secret key used for signing session JWT cookies
JWT_SECRET="your-cryptographic-jwt-secret-string"

# Google Gemini API Key for Quiz & Flashcard generation
GEMINI_API_KEY="AIzaSy..."

# Sockets server port (development local server)
SOCKET_PORT=3001
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"

# SMTP Mail configurations for real OTP emails (e.g. Google App Passwords)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Supabase Storage Buckets configuration (Production PDF uploads)
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-secret-service-role-key"
SUPABASE_BUCKET="notes"
```

---

## 💻 Local Development Setup

Follow these steps to run the complete environment on your local machine:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/yashh972/studenthub.git
   cd studenthub
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Bootstrap Database & Schema**:
   Make sure you have your PostgreSQL instance running and configured in your local `.env`. Then, sync the models:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

4. **Start Sockets Tier**:
   ```bash
   npm run socket
   ```

5. **Start Next.js Frontend App**:
   Open a separate terminal window and run:
   ```bash
   npm run dev
   ```

6. Open your browser and navigate to `http://localhost:3000` to start studying!

---

## 🚀 Cloud Production Deployment Guidelines

StudyHub is built using a modern decoupled server architecture optimized for high performance and low-latency execution:

### 1. Database Tier (Supabase)
* Spin up a new PostgreSQL database on Supabase.
* Create a **Storage Bucket** named exactly **`notes`** and toggle **Public Bucket** to **ON**.
* Retrieve your **Transaction URI** (Port `6543`) for Vercel's `DATABASE_URL` and your **Session/Direct URI** (Port `5432`) for `DIRECT_URL`.

### 2. Sockets Server (Render.com)
* Link your GitHub repository as a new **Web Service** on Render (Oregon region recommended).
* Set the **Build Command** to `npm install` and the **Start Command** to `node socket-server.js`.
* Add environment variables `DATABASE_URL` and `SOCKET_PORT=3001`.
* Copy the live Render service URL (e.g., `https://your-app.onrender.com`) to use in Vercel's config.

### 3. Web Client & APIs (Vercel)
* Import the `studenthub` repository into Vercel as a new project.
* Add all environment variables listed in the configuration checklist. Set `NEXT_PUBLIC_SOCKET_URL` to your Render sockets service URL.
* Set the build command to: `npx prisma generate && next build`.
* Deploy! Vercel's optimized static page generation compiles all routes cleanly.

---

## 👥 Contributors & License
StudyHub is designed and maintained by **Yash** and peer collaborators. Distributed under the MIT License.
