# Vercel Deployment - Quick Start Guide

## 🎯 Executive Summary

**Goal**: Deploy CA Factory UI to production in ~90 minutes

**What We're Deploying**: React 18 + TypeScript SPA (CLABSI Clinical Abstraction UI)

**Where**: Vercel Edge Network (Global CDN with auto-HTTPS)

**Cost**: $20/month (Pro Plan recommended)

---

## 📋 Pre-Deployment Checklist

### ✅ What We Have Ready
- [x] React application (reference-implementation/react/)
- [x] Vercel configuration files (vercel.json, .vercelignore)
- [x] Environment variable template (.env.production.example)
- [x] Complete deployment documentation (VERCEL_DEPLOYMENT_PLAN.md)

### ❓ What We Need to Decide

**CRITICAL DECISION**: Where will the backend API be hosted?

| Option | Platform | Pros | Cons | Setup Time |
|--------|----------|------|------|------------|
| **A** | Vercel Serverless | Single platform, easy setup | 10s timeout, cold starts | 30 min |
| **B** | Railway/Render | No timeout limits, simple | Separate platform | 45 min |
| **C** | AWS/GCP | Full control, scalable | Complex setup | 2-3 hours |

**Recommendation**: **Option B (Railway/Render)** for production reliability

---

## 🚀 5-Step Deployment Process

### Step 1: Backend First (30-45 min)
**Choose one:**

**Option A - Deploy to Railway** (Recommended):
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and init
railway login
cd backend
railway init
railway up

# Get your backend URL
railway domain
# Output: https://your-backend.up.railway.app
```

**Option B - Deploy to Render**:
1. Go to render.com → New Web Service
2. Connect GitHub repo
3. Set: Root Directory = `backend`
4. Set: Build Command = `pip install -r requirements.txt`
5. Set: Start Command = `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
6. Click "Create Web Service"
7. Copy the URL: `https://your-backend.onrender.com`

**Important**: Update backend CORS to allow Vercel:
```python
# In backend/api/main.py
allow_origins=[
    "https://your-app.vercel.app",
    "https://your-app-*.vercel.app",
    "http://localhost:3000"
]
```

### Step 2: Connect Vercel (5 min)
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Navigate to React app
cd reference-implementation/react

# Link to Vercel (creates new project)
vercel link
```

Follow prompts:
- Setup new project? **Yes**
- Project name? **ca-factory-ui** (or your choice)
- Directory? **./reference-implementation/react**

### Step 3: Configure Environment (2 min)

**Set backend URL in Vercel:**
```bash
# Replace with your actual backend URL from Step 1
vercel env add REACT_APP_API_URL production
# When prompted, enter: https://your-backend.railway.app/api
# (or your Render URL)
```

**Or via Vercel Dashboard:**
1. Go to vercel.com/dashboard
2. Select your project
3. Settings → Environment Variables
4. Add: `REACT_APP_API_URL` = `https://your-backend.railway.app/api`

### Step 4: Deploy to Preview (5 min)
```bash
cd reference-implementation/react
vercel
```

Output: `https://ca-factory-ui-xyz123.vercel.app`

**Test the preview URL**:
- [ ] Case list loads
- [ ] Can open PAT-001 and PAT-002
- [ ] Signals display correctly
- [ ] No console errors

### Step 5: Deploy to Production (2 min)
```bash
vercel --prod
```

Output: `https://ca-factory-ui.vercel.app` (or custom domain)

**Done!** 🎉

---

## 🔧 What Vercel Needs From You

### 1. Repository Access
- GitHub repository: `reachosen/Model-Forward-Clinical-Abstraction-Platform`
- Vercel needs read access (granted during `vercel link`)

### 2. Build Configuration
**Already configured in vercel.json:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "framework": "create-react-app"
}
```

### 3. Environment Variables
**Required:**
- `REACT_APP_API_URL` = Your backend API URL

**Optional:**
- `REACT_APP_ENV` = `production`
- `REACT_APP_VERSION` = `2.0.0`

### 4. Domain (Optional)
If you want a custom domain:
```bash
vercel domains add yourdomain.com
```

---

## 📊 What You Get From Vercel

| Feature | What It Means |
|---------|---------------|
| **Auto-Deployment** | Push to main → auto-deploy in 2 min |
| **Preview URLs** | Every PR gets its own URL for testing |
| **Global CDN** | Fast load times worldwide (100+ edge locations) |
| **HTTPS** | Automatic SSL certificates |
| **Instant Rollback** | One-click revert to previous version |
| **Analytics** | Traffic, performance, Core Web Vitals |

---

## ⚡ Quick Reference Commands

```bash
# Deploy to preview (test first!)
vercel

# Deploy to production
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs

# Rollback to previous version
vercel rollback

# Open project in browser
vercel open
```

---

## 🎯 Success Criteria

**Deployment Successful When:**
- ✅ Build completes without errors
- ✅ Production URL loads in browser
- ✅ All 3 pages work (Case List, Case View, Rule Evaluation)
- ✅ API calls succeed (check Network tab)
- ✅ No console errors
- ✅ Lighthouse Performance > 90

**Test These Scenarios:**
1. Load case list → Should show PAT-001 and PAT-002
2. Click on PAT-001 → Should load full case details
3. View Signals panel → Should show grouped signals
4. View Timeline panel → Should show timeline phases
5. Submit feedback → Should post to backend successfully

---

## 🚨 Troubleshooting

### Build Fails
**Issue**: `Module not found: Can't resolve 'xyz'`
**Fix**:
```bash
cd reference-implementation/react
rm -rf node_modules package-lock.json
npm install
vercel
```

### API Calls Fail (CORS Error)
**Issue**: `Access to fetch at 'xyz' has been blocked by CORS policy`
**Fix**: Update backend CORS settings to include Vercel domain

### Environment Variable Not Working
**Issue**: `REACT_APP_API_URL is undefined`
**Fix**:
1. Redeploy after adding env vars: `vercel --prod`
2. Verify in Vercel Dashboard: Settings → Environment Variables
3. Make sure variable name starts with `REACT_APP_`

### Page Shows 404
**Issue**: `/case/PAT-001` shows 404
**Fix**: Ensure `vercel.json` has the rewrite rule (already included)

---

## 💰 Cost Breakdown

### Vercel Pro Plan: $20/month
- 1 TB bandwidth
- Unlimited deployments
- Analytics included
- Team collaboration (5 members)

### Backend Hosting Options:
- **Railway Starter**: $5/month (500 hours)
- **Railway Developer**: $20/month (unlimited hours)
- **Render Free**: $0 (sleeps after 15 min inactivity)
- **Render Starter**: $7/month (always on)

**Total Estimated Cost**: $27-40/month (Vercel Pro + Backend hosting)

---

## 📞 Support Resources

**Vercel Documentation**: vercel.com/docs
**Vercel CLI Reference**: vercel.com/docs/cli
**Railway Docs**: docs.railway.app
**Render Docs**: render.com/docs

**Get Help**:
- Vercel Support: vercel.com/support
- Community Discord: vercel.com/discord

---

## 🎓 Next Steps After Deployment

1. **Monitor Performance**: Enable Vercel Analytics
2. **Set Up Alerts**: Configure uptime monitoring
3. **Custom Domain**: Add your own domain if needed
4. **Team Access**: Invite team members to Vercel project
5. **CI/CD Enhancements**: Add automated tests to deployment pipeline
6. **Staging Environment**: Create a staging branch → separate Vercel project

---

## 📝 Quick Decision Matrix

**Need help deciding? Answer these:**

1. **Q: Do you have a backend deployed already?**
   - Yes → Use its URL in Step 3
   - No → Deploy backend first (Step 1)

2. **Q: Do you need a custom domain?**
   - Yes → Purchase domain, configure after Step 5
   - No → Use `*.vercel.app` domain (free)

3. **Q: How many team members need access?**
   - 1-2 → Hobby plan ok ($0)
   - 3+ → Pro plan needed ($20/mo)

4. **Q: Is this for production use?**
   - Yes → Use Pro plan for analytics & support
   - No (testing only) → Hobby plan ok

---

## 🚀 Ready to Deploy?

**Fastest Path to Production:**
1. Deploy backend to Railway/Render (30 min)
2. Run `vercel link` (2 min)
3. Set `REACT_APP_API_URL` env var (1 min)
4. Run `vercel --prod` (2 min)
5. Test production URL (5 min)

**Total Time**: ~40 minutes

**Start here**: [VERCEL_DEPLOYMENT_PLAN.md](./VERCEL_DEPLOYMENT_PLAN.md) (full documentation)
