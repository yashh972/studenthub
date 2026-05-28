# StudyHub Production Deployment Manual

This document provides clear, step-by-step guidelines for deploying the **StudyHub** platform to production environments. 

Our application is built in a modern, decoupled architecture:
1. **Frontend & REST API**: Next.js App Router (Port 3000)
2. **Real-time Server**: Standalone Socket.IO Express engine (Port 3001)
3. **Database Layer**: PostgreSQL database managed via Prisma ORM

---

## Production Environment Variables Checklist

Ensure these variables are defined in your production hosting dashboards:

* `DATABASE_URL`: Connection string to your production PostgreSQL instance (Supabase, Neon, etc.).
* `JWT_SECRET`: A long, cryptographically secure random string used to sign cookies.
* `GEMINI_API_KEY`: Your active Google AI Studio Developer API key.
* `UPLOAD_DIR`: Target folder where notes/PDFs are written (e.g. `./public/uploads` for disk write, or path to persistent block volumes).

---

## Component-by-Component Deploy Strategy

### 1. Database Layer (PostgreSQL)
For a production database, avoid hosting PostgreSQL on the same container as your server without block storage (due to data loss on restarts).
* **Recommended Host**: [Supabase](https://supabase.com) or [Neon.tech](https://neon.tech) (highly performant, serverless Postgres).
* **Deployment Steps**:
  1. Spin up a new PostgreSQL project on Supabase/Neon.
  2. Copy the **Transaction** or **Direct** connection URL.
  3. Set this URL as the `DATABASE_URL` environment variable.
  4. In your deployment build commands, run `npx prisma db push` (or `npx prisma migrate deploy` if migrating schemas) to automatically bootstrap tables.

---

### 2. Frontend & API Portal (Next.js)
The Next.js client is optimized for serverless deployments.
* **Recommended Host**: [Vercel](https://vercel.com) (official creator of Next.js, hosting it with high speed and zero-config Edge Middlewares).
* **Deployment Steps**:
  1. Connect your Github repository to Vercel.
  2. Import the `StudyHub` project directory.
  3. Populate all Environment Variables (`DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`).
  4. Set the **Build Command** to:
     ```bash
     npx prisma generate && next build
     ```
  5. Click **Deploy**. Vercel will build your static assets, compile API routes, and deploy the Edge Middleware dynamically!

---

### 3. Standalone Sockets Chat Server (Express + Socket.IO)
Next.js serverless functions are short-lived and do not support persistent WebSockets. Therefore, the standalone `socket-server.js` must be hosted on a persistent container instance.
* **Recommended Host**: [Render.com](https://render.com) (Web Service tier), [Railway.app](https://railway.app), or a [VPS/DigitalOcean Droplet](https://digitalocean.com).
* **Deployment Steps (on Render / Railway)**:
  1. Create a new **Web Service** or continuous container in Render/Railway.
  2. Point it to your Github repository.
  3. Set the **Build Command** to `npm install`.
  4. Set the **Start Command** to `node socket-server.js` or `npm run socket`.
  5. Add Environment Variables:
     - `DATABASE_URL`: Point to the same PostgreSQL connection string used by Next.js.
     - `PORT`: Set to `3001` (or let the platform dynamically assign one via `process.env.PORT`).
     - Configure CORS inside `socket-server.js` to authorize your Next.js Vercel production domain!
  6. Click **Deploy**. You will receive a live URL (e.g. `https://studyhub-sockets.onrender.com`).
  7. Open [src/app/dashboard/chat/page.jsx](file:///c:/Users/yashj/StudentHUB/src/app/dashboard/chat/page.jsx#L71) and update the client-side Socket connection string from `http://localhost:3001` to your new live sockets URL:
     ```javascript
     // Update:
     socketRef.current = io('https://your-socket-server-domain.onrender.com', {
       withCredentials: true,
       transports: ['websocket', 'polling']
     });
     ```
