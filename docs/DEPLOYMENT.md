# CosmoGrid Production Deployment Guide

This document outlines the deployment process for CosmoGrid, including environment variables, database setup, and cloud provider configurations.

---

## 1. Environment Variables Configuration

Create distinct environment setups for development and production.

### Backend Server (`apps/server`)
```env
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<db>?sslmode=require"
PORT=3001
```

### Frontend Client (`apps/web`)
```env
NEXT_PUBLIC_WS_URL="https://your-backend-railway-url.up.railway.app"
```

---

## 2. Database Setup (Neon PostgreSQL)

We recommend **Neon PostgreSQL** for host deployments.

1. **Create Project**: Sign in to Neon and create a fresh PostgreSQL database.
2. **Retrieve Connection String**: Copy the URL containing `sslmode=require` from the Neon dashboard.
3. **Configure Connection Pooling**: 
   - Toggle **Connection Pooling** (PgBouncer) on the Neon dashboard.
   - Use the transaction connection string (usually port `5432` or pooler domain prefixes) inside the server environment variables. This prevents connection exhaustion under load.
4. **Push Database Schema**: Run migrations in the root directory:
   ```bash
   npx prisma db push
   ```

---

## 3. Backend Deployment (Railway)

We recommend **Railway** to host the Express/Socket.IO server, as it natively supports persistent WebSocket protocols.

1. **Initialize Project**: Connect your GitHub repository to Railway.
2. **Specify Monorepo Root**: Set **Root Directory** settings to `/` or specify start commands inside the sub-project:
   - Build Command: `pnpm --filter server build`
   - Start Command: `pnpm --filter server start`
3. **Configure Sockets Port**: Add variable `PORT=3001` or let Railway assign it dynamically.
4. **Provide Database URL**: Input the Neon transaction URL in Railway environment variables as `DATABASE_URL`.

---

## 4. Frontend Deployment (Vercel)

Next.js projects deploy natively to **Vercel**.

1. **Create Vercel Project**: Link your GitHub repository in the Vercel dashboard.
2. **Set Monorepo Settings**:
   - Framework Preset: **Next.js**
   - Root Directory: `apps/web`
3. **Configure Environment Variables**:
   - Add `NEXT_PUBLIC_WS_URL` pointing to the live Railway domain.
4. **Build and Deploy**: Vercel handles the Next.js compilation, optimization, and edge routing automatically.

---

## 5. Production Considerations

### Sockets sticky sessions
If scaling the backend horizontally behind load balancers:
- Enable **Sticky Sessions** (Session Affinity) on your ingress controllers. Sockets handshakes will fail if different HTTP upgrade requests hit separate servers.

### Database Connection Limits
Ensure PostgreSQL pools are constrained:
- Prisma defaults to 20 connection slots per instance. In serverless or scaling server node environments, this can saturate database connection limits. Append `&connection_limit=5` to the `DATABASE_URL` string to manage this.
