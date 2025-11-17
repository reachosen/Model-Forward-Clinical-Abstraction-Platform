# Vercel UI Deployment Plan - CA Factory
## Executive Summary

**Objective**: Deploy the CLABSI Clinical Abstraction UI (React SPA) to Vercel with backend API integration

**Tech Stack**: React 18 + TypeScript + Create React App → Vercel Edge Network
**Build Time**: ~2-3 minutes
**Deployment Strategy**: Git-based auto-deployment from main branch

---

## 1. Current State Analysis

### React Application Structure
```
reference-implementation/react/
├── src/
│   ├── components/      # 20+ React components
│   ├── pages/           # 3 main pages (CaseList, CaseView, RuleEvaluation)
│   ├── api/             # API client (axios-based)
│   ├── types/           # TypeScript definitions
│   ├── contexts/        # React contexts (DomainConfig)
│   └── App.tsx          # Main app with React Router
├── public/              # Static assets
├── package.json         # Dependencies
└── .env                 # Environment variables
```

### Key Dependencies
- **React**: 18.2.0
- **React Router**: 6.20.0
- **Axios**: 1.6.0
- **TypeScript**: 4.9.5
- **Build Tool**: react-scripts 5.0.1

### Current Environment Variables
```
REACT_APP_API_URL=http://localhost:5000/api
```

---

## 2. What Vercel Needs (Deployment Specifications)

### A. Repository Configuration
```yaml
Framework: Create React App
Build Command: npm run build
Output Directory: build
Install Command: npm install
Node Version: 18.x
```

### B. Environment Variables
```bash
# Production API endpoint
REACT_APP_API_URL=https://your-backend-api.example.com/api

# Optional: Analytics/monitoring
REACT_APP_ENV=production
REACT_APP_VERSION=2.0.0
```

### C. Required Files

#### 1. `vercel.json` (Routing & Configuration)
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "framework": "create-react-app",
  "routes": [
    {
      "src": "/static/(.*)",
      "dest": "/static/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

#### 2. `.vercelignore` (Exclude from deployment)
```
node_modules
.env.local
.env.development
*.log
.DS_Store
coverage
```

#### 3. `.env.production` (Production environment variables)
```bash
# To be configured in Vercel dashboard
REACT_APP_API_URL=__PLACEHOLDER__
```

---

## 3. Backend API Requirements

### Current API Endpoints Used by UI
```
GET  /cases                           # List all cases
GET  /cases/{patient_id}              # Legacy case format
POST /api/demo/context                # Structured case format (NEW)
POST /api/demo/abstract               # Run abstraction
POST /api/demo/feedback               # Submit feedback
POST /v1/task/{task_id}/interrogate   # Ask Panel (NEW)
GET  /v1/case/{case_id}/tasks         # Task tracking (NEW)
GET  /v1/task/{task_id}               # Task details (NEW)
```

### Backend Deployment Options

#### Option A: Deploy Backend to Vercel Serverless (Recommended)
- **What**: Deploy FastAPI backend as Vercel serverless functions
- **Pros**: Single platform, automatic CORS handling, unified dashboard
- **Cons**: Cold start latency, 10-second timeout limit
- **Setup Required**:
  ```json
  // vercel.json for backend
  {
    "builds": [
      {
        "src": "backend/api/main.py",
        "use": "@vercel/python"
      }
    ],
    "routes": [
      {
        "src": "/(.*)",
        "dest": "backend/api/main.py"
      }
    ]
  }
  ```

#### Option B: Deploy Backend Separately (AWS/GCP/Railway)
- **What**: Host FastAPI on dedicated infrastructure
- **Pros**: No timeout limits, better for long-running tasks, more control
- **Cons**: Separate deployment pipeline, CORS configuration needed
- **Setup Required**:
  - Configure CORS in FastAPI to allow Vercel domain
  - Set `REACT_APP_API_URL` in Vercel to backend URL

#### Option C: Hybrid Approach
- **What**: Use Vercel for UI + Vercel Serverless for lightweight endpoints + External service for heavy compute
- **Pros**: Best of both worlds
- **Cons**: More complex architecture

---

## 4. Step-by-Step Deployment Process

### Phase 1: Pre-Deployment Preparation (15 minutes)

**Task 1.1**: Create Vercel configuration files
- [ ] Create `vercel.json` in `reference-implementation/react/`
- [ ] Create `.vercelignore`
- [ ] Create `.env.production.example`

**Task 1.2**: Update package.json scripts
```json
"scripts": {
  "start": "react-scripts start",
  "build": "react-scripts build",
  "test": "react-scripts test",
  "eject": "react-scripts eject",
  "build:vercel": "REACT_APP_ENV=production npm run build"
}
```

**Task 1.3**: Verify API client for production
- [ ] Review `src/api/client.ts` - ensure it respects `REACT_APP_API_URL`
- [ ] Add error handling for API failures
- [ ] Add loading states

**Task 1.4**: Security audit
- [ ] Remove any hardcoded secrets
- [ ] Verify .env is in .gitignore
- [ ] Add security headers to vercel.json

### Phase 2: Backend Deployment Decision (Choose One)

**Decision Point**: Where will the FastAPI backend be hosted?

**Option A Path**: Vercel Serverless
1. Create `backend/vercel.json`
2. Install `@vercel/python` build pack
3. Configure Python dependencies
4. Deploy backend first: `vercel --prod`
5. Get backend URL → use in frontend env

**Option B Path**: External Service (Railway/Render/AWS)
1. Deploy backend to chosen platform
2. Note the backend URL
3. Configure CORS in backend:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["https://your-app.vercel.app"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

### Phase 3: Vercel Project Setup (10 minutes)

**Task 3.1**: Connect Repository to Vercel
```bash
# Install Vercel CLI (if not already)
npm i -g vercel

# Login to Vercel
vercel login

# Link project to Vercel
cd reference-implementation/react
vercel link
```

**Task 3.2**: Configure Project Settings
```bash
# Set framework preset
vercel --framework create-react-app

# Set root directory
vercel --root-directory reference-implementation/react

# Set build settings
vercel --build-command "npm run build"
vercel --output-directory "build"
```

**Task 3.3**: Set Environment Variables
```bash
# Via CLI
vercel env add REACT_APP_API_URL production

# Or via Vercel Dashboard:
# Project Settings → Environment Variables
# Add: REACT_APP_API_URL = https://your-backend-api.com/api
```

### Phase 4: Deploy (5 minutes)

**Task 4.1**: Preview Deployment (Test First)
```bash
cd reference-implementation/react
vercel
```
- Vercel generates preview URL: `https://your-app-xyz.vercel.app`
- Test all pages and API calls
- Verify environment variables are working

**Task 4.2**: Production Deployment
```bash
vercel --prod
```
- Deploys to production URL: `https://your-app.vercel.app`
- Custom domain can be configured after

**Task 4.3**: Setup Auto-Deployment
- In Vercel Dashboard → Project Settings → Git
- Enable: "Deploy on push to main branch"
- Configure: Production branch = `main`
- Configure: Preview branches = all other branches

### Phase 5: Post-Deployment Validation (10 minutes)

**Task 5.1**: Functional Testing
- [ ] Load Case List page
- [ ] Open a specific case (PAT-001, PAT-002)
- [ ] Test SignalsPanel - verify signal groups display
- [ ] Test TimelinePanel - verify timeline phases
- [ ] Test InterrogationPanel - if QA history exists
- [ ] Test Ask Panel - submit a question
- [ ] Test Abstraction - run abstraction on a case
- [ ] Test Feedback submission

**Task 5.2**: Performance Testing
- [ ] Lighthouse score > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] API response times < 5s

**Task 5.3**: Error Handling
- [ ] Test with network disconnected
- [ ] Test with invalid case ID
- [ ] Test with backend down
- [ ] Verify error messages are user-friendly

---

## 5. Configuration Files to Create

### File 1: `reference-implementation/react/vercel.json`
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "installCommand": "npm install",
  "framework": "create-react-app",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

### File 2: `reference-implementation/react/.vercelignore`
```
node_modules
.env
.env.local
.env.development
*.log
.DS_Store
coverage
.cache
```

### File 3: `reference-implementation/react/.env.production.example`
```bash
# Production Environment Variables Template
# Copy to .env.production and fill in actual values
# DO NOT commit .env.production to git

# Backend API URL (Required)
REACT_APP_API_URL=https://your-backend-api.example.com/api

# Application Environment
REACT_APP_ENV=production

# Application Version (matches backend)
REACT_APP_VERSION=2.0.0

# Optional: Analytics
# REACT_APP_ANALYTICS_ID=your-analytics-id

# Optional: Feature Flags
# REACT_APP_ENABLE_INTERROGATION=true
# REACT_APP_ENABLE_FEEDBACK=true
```

---

## 6. Expected Outcomes & Success Metrics

### Deployment Success Criteria

**Build Success**:
- ✅ Build completes in < 3 minutes
- ✅ No TypeScript errors
- ✅ No dependency vulnerabilities (critical/high)
- ✅ Build size < 5MB (optimized)

**Runtime Success**:
- ✅ All pages load successfully
- ✅ API integration working (all endpoints responding)
- ✅ No console errors in production
- ✅ Lighthouse Performance > 90
- ✅ Lighthouse Accessibility > 95
- ✅ Lighthouse Best Practices > 90

**User Experience**:
- ✅ Page load time < 2s (on 4G)
- ✅ Interactive within 3s
- ✅ Smooth navigation between pages
- ✅ Error messages display clearly
- ✅ Loading states show appropriately

### Monitoring & Alerts

**Setup Required**:
1. Vercel Analytics (built-in)
2. Error tracking (Sentry recommended)
3. Uptime monitoring (UptimeRobot/Pingdom)
4. API health checks

---

## 7. Cost Estimation (Vercel Pricing)

### Hobby Plan (Free)
- ✅ Unlimited deployments
- ✅ 100 GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ Preview deployments
- ❌ No team features
- ❌ No advanced analytics
- **Cost**: $0/month

### Pro Plan (Recommended)
- ✅ Everything in Hobby
- ✅ 1 TB bandwidth/month
- ✅ Analytics & logs
- ✅ Password protection
- ✅ Team collaboration (5 members)
- **Cost**: $20/month

### Enterprise Plan
- ✅ Everything in Pro
- ✅ Unlimited bandwidth
- ✅ Advanced DDoS protection
- ✅ SLA uptime guarantee
- ✅ Dedicated support
- **Cost**: Custom pricing

**Recommendation**: Start with **Pro Plan** ($20/month) for production use

---

## 8. Rollback Strategy

### If Deployment Fails

**Option 1**: Instant Rollback via Vercel Dashboard
```
Dashboard → Deployments → [Previous successful deployment] → Promote to Production
```
- Takes ~30 seconds
- Zero downtime

**Option 2**: Revert via CLI
```bash
vercel rollback
```

**Option 3**: Git-based revert
```bash
git revert <bad-commit>
git push origin main
# Vercel auto-deploys the reverted version
```

### Deployment Safeguards

1. **Always deploy to preview first**: `vercel` (not `vercel --prod`)
2. **Test preview thoroughly** before promoting to production
3. **Enable deployment protection**: Require approval for production deployments
4. **Use staging environment**: Create a staging branch → separate Vercel project

---

## 9. Backend Integration Checklist

### What Backend Must Provide

**Required**:
- [ ] **CORS configured** to allow Vercel domain
- [ ] **HTTPS enabled** (Vercel requires HTTPS for production)
- [ ] **Health check endpoint**: `GET /health` → 200 OK
- [ ] **Error responses** in consistent JSON format
- [ ] **API versioning** (currently /v1/)
- [ ] **Rate limiting** (recommended: 100 req/min per IP)

**Recommended**:
- [ ] **API documentation** (Swagger/OpenAPI at /docs)
- [ ] **Request/response logging**
- [ ] **Authentication tokens** (if needed)
- [ ] **Caching headers** for static data
- [ ] **Compression** (gzip/brotli)

### CORS Configuration Example (FastAPI)

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-app.vercel.app",
        "https://your-app-*.vercel.app",  # Preview deployments
        "http://localhost:3000",           # Local development
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
```

---

## 10. Timeline Estimate

| Phase | Tasks | Duration | Blocker Risk |
|-------|-------|----------|--------------|
| **Pre-Deployment** | Config files, security audit | 15 min | Low |
| **Backend Setup** | Deploy/configure backend API | 30-60 min | Medium |
| **Vercel Setup** | Connect repo, configure project | 10 min | Low |
| **Initial Deploy** | First deployment + testing | 15 min | Medium |
| **Validation** | Full functional testing | 20 min | Low |
| **Domain Setup** | Custom domain (optional) | 10 min | Low |
| **Total** | | **90-120 min** | |

**Critical Path**: Backend deployment → Frontend deployment → Validation

---

## 11. Next Steps (Action Items)

### Immediate Actions (Do Now)

1. **Decision Required**: Where will backend be hosted?
   - [ ] Option A: Vercel Serverless Functions
   - [ ] Option B: External service (Railway/Render/AWS/GCP)
   - [ ] Option C: Hybrid approach

2. **Create configuration files**:
   - [ ] `vercel.json`
   - [ ] `.vercelignore`
   - [ ] `.env.production.example`

3. **Update package.json**:
   - [ ] Add `build:vercel` script
   - [ ] Verify all dependencies are production-ready

4. **Security audit**:
   - [ ] Remove hardcoded API URLs (check for localhost references)
   - [ ] Verify .env in .gitignore
   - [ ] Add security headers

### Short-Term Actions (This Week)

5. **Deploy backend** (based on decision in step 1)
6. **Connect GitHub to Vercel**
7. **Configure environment variables in Vercel**
8. **Deploy to preview environment**
9. **Full functional testing**
10. **Deploy to production**

### Long-Term Actions (Post-Launch)

11. **Set up monitoring**: Analytics, error tracking, uptime
12. **Configure custom domain** (if needed)
13. **Set up CI/CD checks**: Lighthouse CI, type checking
14. **Document deployment process** for team

---

## 12. Questions to Answer Before Proceeding

1. **Backend Hosting**: Where will the FastAPI backend be deployed?
2. **Domain**: Do you need a custom domain, or is `*.vercel.app` sufficient?
3. **Authentication**: Does the UI need user authentication? (Not currently implemented)
4. **Environment**: Do you need separate staging/production environments?
5. **Team Access**: How many team members need Vercel access?
6. **Budget**: What's the monthly budget for hosting? (Determines Vercel plan)
7. **Data Privacy**: Any HIPAA/PHI concerns? (May require specific deployment approach)

---

## Summary

**What You Provide to Vercel**:
1. GitHub repository with React app
2. Configuration files (`vercel.json`, `.vercelignore`)
3. Environment variables (via Dashboard or CLI)
4. Backend API URL

**What Vercel Provides**:
1. Build infrastructure (Node 18, npm, CI/CD)
2. Edge network (Global CDN)
3. HTTPS certificates (automatic)
4. Preview deployments (for every git push)
5. Instant rollbacks
6. Analytics & logs

**Expected Result**:
- Production URL: `https://your-app.vercel.app` (or custom domain)
- Automatic deployments on every push to main
- Preview URLs for every PR
- Full CA Factory UI functionality with structured case support

---

**Ready to Deploy?** Follow the step-by-step process starting with Phase 1.
