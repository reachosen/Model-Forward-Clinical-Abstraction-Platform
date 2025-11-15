# Component Integration Staging Area

This folder is for staging Vercel v0.dev generated components before integration.

## Workflow

### Step 1: Generate Component in Vercel v0.dev
- Use specs from `/docs/vercel-ui-specs/`
- Download component as zip

### Step 2: Extract to This Folder
Extract Vercel zip contents to component-specific subfolder:

```
toIntegrate/
├── EnhancedTimeline/
│   ├── EnhancedTimeline.tsx
│   └── EnhancedTimeline.css
├── SearchFilterPanel/
│   ├── SearchFilterPanel.tsx
│   └── SearchFilterPanel.css
└── README.md (this file)
```

### Step 3: Push to Git
From your local machine:

```bash
cd /path/to/Model-Forward-Clinical-Abstraction-Platform
git add reference-implementation/toIntegrate/
git commit -m "Add [ComponentName] from Vercel for integration"
git push origin claude/clinical-data-flowchart-01Giu8pxaZdDHFZm8vsCsJ2h
```

### Step 4: Notify Claude
In chat, say:
> "I've pushed EnhancedTimeline to toIntegrate folder"

Claude will:
1. Review the component code
2. Fix any TypeScript/integration issues
3. Move to proper location (`src/components/`)
4. Update parent components with imports
5. Test compilation
6. Commit integrated changes
7. Clean up staging folder

---

## Current Status

### Pending Integration
- [ ] None

### Completed
- [ ] None

---

## Notes
- Keep each component in its own subfolder
- Include all files from Vercel zip (tsx, css, any assets)
- Don't modify Vercel code before pushing - let Claude handle integration fixes
