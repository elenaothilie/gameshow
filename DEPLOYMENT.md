# Deploying to Vercel & GitHub

This gameshow app is built to run on **Vercel** and works with **GitHub** for version control and CI/CD.

## Prerequisites

- A [GitHub](https://github.com) account
- A [Vercel](https://vercel.com) account
- An [Upstash Redis](https://upstash.com) database (free tier works)

## 1. Create Upstash Redis Database

1. Go to [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database
3. Copy the **REST URL** and **REST Token** from the database details

Or use the [Vercel Upstash Integration](https://vercel.com/integrations/upstash) to create and link a Redis database automatically.

## 2. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## 3. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Before deploying, add these **Environment Variables**:
   - `UPSTASH_REDIS_REST_URL` — Your Upstash Redis REST URL
   - `UPSTASH_REDIS_REST_TOKEN` — Your Upstash Redis REST Token
5. Click **Deploy**

Vercel will build and deploy your app. Each push to your main branch will trigger a new deployment.

## 4. Local Development

For local development, you can run without Redis (uses in-memory storage):

```bash
npm install
npm run dev
```

For persistence across server restarts, add a `.env.local` file:

```
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

## How It Works

- **Vercel**: Hosts the Next.js app as serverless functions. No WebSockets—the app uses REST API + polling for real-time updates.
- **Upstash Redis**: Stores session data (game state, teams, buzzes) in a serverless-friendly way.
- **GitHub**: Source control and triggers Vercel deployments on push.
