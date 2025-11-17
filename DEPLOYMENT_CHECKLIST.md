# Vercel Deployment Checklist

## 🎯 Objective
Deploy CA Factory UI to Vercel in production-ready state

**Estimated Time**: 90 minutes
**Team Required**: 1 developer
**Prerequisites**: GitHub account, Vercel account, Backend deployment decision

---

## Phase 1: Pre-Deployment ✅ COMPLETE

- [x] **Vercel configuration created**: `reference-implementation/react/vercel.json`
- [x] **Ignore file created**: `reference-implementation/react/.vercelignore`
- [x] **Environment template created**: `reference-implementation/react/.env.production.example`
- [x] **Documentation completed**: VERCEL_DEPLOYMENT_PLAN.md (full), VERCEL_QUICK_START.md (executive)

---

## Phase 2: Backend Deployment (Choose One)

### ⚠️ DECISION REQUIRED: Select Backend Hosting Platform

#### Option A: Railway (Recommended for Simplicity)
- [ ] Sign up at railway.app
- [ ] Install Railway CLI: `npm i -g @railway/cli`
- [ ] Deploy backend:
  ```bash
  railway login
  cd backend
  railway init
  railway up
  railway domain  # Get URL
  ```
- [ ] **Record backend URL**: _____________________________
- [ ] Update CORS in `backend/api/main.py` to allow Vercel domains
- [ ] Test health endpoint: `curl https://your-backend.railway.app/health`

#### Option B: Render
- [ ] Sign up at render.com
- [ ] Create new Web Service
- [ ] Connect GitHub repo
- [ ] Configure:
  - Root Directory: `backend`
  - Build Command: `pip install -r requirements.txt`
  - Start Command: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
- [ ] **Record backend URL**: _____________________________
- [ ] Update CORS in `backend/api/main.py` to allow Vercel domains
- [ ] Test health endpoint: `curl https://your-backend.onrender.com/health`

#### Option C: Vercel Serverless
- [ ] Create `backend/vercel.json` with Python configuration
- [ ] Deploy: `cd backend && vercel --prod`
- [ ] **Record backend URL**: _____________________________
- [ ] Note: 10-second timeout limit applies

### Backend CORS Configuration (Required for All Options)
- [ ] Edit `backend/api/main.py`:
  ```python
  app.add_middleware(
      CORSMiddleware,
      allow_origins=[
          "https://ca-factory-ui.vercel.app",  # Your production URL
          "https://ca-factory-ui-*.vercel.app",  # Preview deployments
          "http://localhost:3000"  # Local dev
      ],
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```
- [ ] Commit and push CORS changes
- [ ] Redeploy backend with CORS updates
- [ ] Verify CORS: `curl -H "Origin: https://ca-factory-ui.vercel.app" -I https://your-backend.url/health`

---

## Phase 3: Vercel Project Setup

### 3.1 Install Vercel CLI
- [ ] Install globally: `npm i -g vercel`
- [ ] Verify installation: `vercel --version`

### 3.2 Login to Vercel
- [ ] Run: `vercel login`
- [ ] Choose authentication method (GitHub/GitLab/Email)
- [ ] Complete authentication
- [ ] Verify: `vercel whoami`

### 3.3 Link Project
- [ ] Navigate to React app: `cd reference-implementation/react`
- [ ] Run: `vercel link`
- [ ] Answer prompts:
  - Set up new project? → **Yes**
  - Which scope? → Select your account/team
  - Project name? → **ca-factory-ui** (or your choice)
  - Link to existing? → **No**
- [ ] Verify: `vercel ls` (should show your project)

### 3.4 Configure Environment Variables
- [ ] Set backend API URL:
  ```bash
  vercel env add REACT_APP_API_URL production
  ```
  Enter value: `https://your-backend-url/api` (from Phase 2)

- [ ] Optional - Set additional vars:
  ```bash
  vercel env add REACT_APP_ENV production
  # Enter: production

  vercel env add REACT_APP_VERSION production
  # Enter: 2.0.0
  ```

- [ ] Verify in Vercel Dashboard:
  - Go to vercel.com/dashboard
  - Select your project
  - Settings → Environment Variables
  - Confirm `REACT_APP_API_URL` is set

---

## Phase 4: Preview Deployment (Testing)

### 4.1 Deploy to Preview
- [ ] Ensure you're in: `reference-implementation/react`
- [ ] Run: `vercel`
- [ ] Wait for build (2-3 minutes)
- [ ] **Record preview URL**: _____________________________

### 4.2 Test Preview Deployment
- [ ] Open preview URL in browser
- [ ] **Test Case List Page**:
  - [ ] Page loads without errors
  - [ ] Case list displays (PAT-001, PAT-002)
  - [ ] Search/filter works
- [ ] **Test Case View Page** (PAT-001):
  - [ ] Click on PAT-001 → case detail loads
  - [ ] Patient demographics display
  - [ ] Signals Panel shows grouped signals
  - [ ] Timeline Panel shows timeline phases
  - [ ] Abstraction results display
  - [ ] Determination shows (CLABSI_CONFIRMED)
- [ ] **Test Case View Page** (PAT-002):
  - [ ] Click on PAT-002 → case detail loads
  - [ ] Determination shows (CLABSI_RULED_OUT or similar)
- [ ] **Test API Integration**:
  - [ ] Open browser DevTools → Network tab
  - [ ] Reload page
  - [ ] Verify API calls succeed (200 status)
  - [ ] Check: `/api/demo/context` → 200 OK
- [ ] **Test Console** (DevTools → Console):
  - [ ] No red errors
  - [ ] Warnings are acceptable (if minor)
- [ ] **Test Feedback Submission** (if applicable):
  - [ ] Submit feedback on a case
  - [ ] Verify POST request succeeds

### 4.3 Performance Check
- [ ] Run Lighthouse audit (DevTools → Lighthouse → Analyze page load)
- [ ] **Check scores**:
  - [ ] Performance > 85 (target: 90+)
  - [ ] Accessibility > 90 (target: 95+)
  - [ ] Best Practices > 85 (target: 90+)
  - [ ] SEO > 80

### 4.4 Issues Found?
- [ ] If issues found, fix in code
- [ ] Commit and push fixes
- [ ] Run `vercel` again to redeploy preview
- [ ] Re-test until all checks pass

---

## Phase 5: Production Deployment

### 5.1 Deploy to Production
- [ ] **Double-check environment variables** (vercel.com/dashboard → project → settings)
- [ ] Ensure you're in: `reference-implementation/react`
- [ ] Run: `vercel --prod`
- [ ] Wait for build (2-3 minutes)
- [ ] **Record production URL**: _____________________________

### 5.2 Test Production Deployment
- [ ] Open production URL
- [ ] **Repeat all tests from Phase 4.2** (Case List, Case View, API, Console)
- [ ] Verify production environment:
  - [ ] Check Network tab → API calls go to correct backend
  - [ ] No localhost references
  - [ ] HTTPS enabled (should be automatic)

### 5.3 Configure Auto-Deployment (Optional but Recommended)
- [ ] Go to Vercel Dashboard → Project → Settings → Git
- [ ] Verify connected to GitHub repo
- [ ] **Production Branch**: Set to `main` (or your default branch)
- [ ] **Preview Branches**: Enable for all branches
- [ ] **Deployment Protection**: Enable if you want manual approval for production

---

## Phase 6: Post-Deployment Configuration

### 6.1 Custom Domain (Optional)
- [ ] Purchase domain (if not already owned)
- [ ] Go to Vercel Dashboard → Project → Settings → Domains
- [ ] Add domain: `yourdomain.com`
- [ ] Follow DNS configuration instructions
- [ ] Wait for DNS propagation (5-60 minutes)
- [ ] **Update backend CORS** to include new domain
- [ ] Test custom domain

### 6.2 Team Access (Optional)
- [ ] Go to Vercel Dashboard → Team Settings → Members
- [ ] Invite team members
- [ ] Set appropriate roles (Viewer, Developer, Owner)

### 6.3 Monitoring Setup
- [ ] **Vercel Analytics** (Built-in):
  - [ ] Enable in Dashboard → Project → Analytics
- [ ] **Error Tracking** (Recommended: Sentry):
  - [ ] Sign up at sentry.io
  - [ ] Create new project (React)
  - [ ] Install: `npm install @sentry/react`
  - [ ] Add Sentry DSN to Vercel env vars
  - [ ] Configure in React app
- [ ] **Uptime Monitoring** (Recommended: UptimeRobot):
  - [ ] Sign up at uptimerobot.com
  - [ ] Create HTTP(s) monitor for production URL
  - [ ] Set check interval: 5 minutes
  - [ ] Configure email/SMS alerts

---

## Phase 7: Documentation & Handoff

### 7.1 Document Deployment Details
- [ ] **Record in team wiki/docs**:
  - Production URL: _____________________________
  - Preview URL pattern: _____________________________
  - Backend URL: _____________________________
  - Vercel project name: _____________________________
  - Vercel team/account: _____________________________

### 7.2 Create Runbook
- [ ] Document how to deploy updates (push to main → auto-deploy)
- [ ] Document how to rollback (Vercel Dashboard → Deployments → Rollback)
- [ ] Document how to check logs (Vercel Dashboard → Deployments → Logs)
- [ ] Document environment variables and how to update them

### 7.3 Team Training (if needed)
- [ ] Walk team through Vercel dashboard
- [ ] Show how to view deployment status
- [ ] Show how to check preview URLs for PRs
- [ ] Show how to rollback if needed

---

## Phase 8: Validation & Sign-Off

### 8.1 Final Validation Checklist
- [ ] **Functionality**:
  - [ ] All pages load correctly
  - [ ] All API integrations work
  - [ ] No console errors
  - [ ] User flows work end-to-end
- [ ] **Performance**:
  - [ ] Lighthouse Performance > 85
  - [ ] Page load < 3 seconds (on 4G)
  - [ ] Time to Interactive < 5 seconds
- [ ] **Security**:
  - [ ] HTTPS enabled
  - [ ] Security headers configured (from vercel.json)
  - [ ] No exposed secrets in code
  - [ ] CORS properly configured
- [ ] **Monitoring**:
  - [ ] Vercel Analytics enabled
  - [ ] Error tracking configured
  - [ ] Uptime monitoring active
- [ ] **Documentation**:
  - [ ] Deployment details documented
  - [ ] Runbook created
  - [ ] Team trained (if applicable)

### 8.2 Stakeholder Sign-Off
- [ ] Demo to stakeholders
- [ ] Get sign-off from:
  - [ ] Technical lead
  - [ ] Product owner
  - [ ] QA (if applicable)

---

## 🎉 Deployment Complete!

### Success Metrics
- ✅ Production URL live and accessible
- ✅ All tests passing
- ✅ Auto-deployment configured
- ✅ Monitoring active
- ✅ Team trained
- ✅ Documentation complete

### Next Steps (Post-Launch)
1. Monitor analytics for first week
2. Track and triage any errors (Sentry)
3. Gather user feedback
4. Plan next iteration/features

---

## 📊 Quick Reference

| Item | Value |
|------|-------|
| **Backend URL** | _____________________________ |
| **Production URL** | _____________________________ |
| **Vercel Project** | _____________________________ |
| **Custom Domain** | _____________________________ |
| **Deployment Date** | _____________________________ |
| **Deployed By** | _____________________________ |

---

## 🚨 Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| **Technical Lead** | ____________ | ____________ |
| **DevOps/Infrastructure** | ____________ | ____________ |
| **Vercel Account Owner** | ____________ | ____________ |

---

## 🔗 Important Links

- **Production**: _____________________________
- **Vercel Dashboard**: https://vercel.com/dashboard
- **GitHub Repo**: https://github.com/reachosen/Model-Forward-Clinical-Abstraction-Platform
- **Backend API**: _____________________________
- **Full Deployment Docs**: [VERCEL_DEPLOYMENT_PLAN.md](./VERCEL_DEPLOYMENT_PLAN.md)
- **Quick Start Guide**: [VERCEL_QUICK_START.md](./VERCEL_QUICK_START.md)

---

**Last Updated**: [DATE]
**Checklist Version**: 1.0
