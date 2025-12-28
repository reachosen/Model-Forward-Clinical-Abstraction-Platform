<#
.SYNOPSIS
    Runs the complete PromptBattleTestFlyWheel loop for a specific metric.
#>

param (
    [string]$MetricID = "I25",
    [int]$BatchSize = 5
)

$ErrorActionPreference = "Stop"
$RootPath = Get-Location

# Robust Directory Detection
if (Test-Path "factory-cli") {
    # We are at Repo Root
    Write-Host "Changing directory to factory-cli..." -ForegroundColor Gray
    Set-Location "factory-cli"
} elseif (Test-Path "package.json") {
    # We might be in the CLI root already
    $PackageName = (Get-Content "package.json" | ConvertFrom-Json).name
    if ($PackageName -eq "factory-cli") {
        Write-Host "Already in factory-cli root." -ForegroundColor Gray
    } else {
        Write-Error "Context Error: Found package.json but name is '$PackageName'. Expected 'factory-cli'."
        exit 1
    }
} else {
    Write-Error "Context Error: Could not locate 'factory-cli' directory or package.json."
    exit 1
}

try {
    Write-Host "`n>>> STARTING PROMPT BATTLE TEST FLYWHEEL: $MetricID <<<`n" -ForegroundColor Cyan

    # -----------------------------------------------------------------------------
    # STEP 1: PLAN GENERATION
    # -----------------------------------------------------------------------------
    Write-Host "1. [PLAN GENERATION] Drafting initial prompts for $MetricID..." -ForegroundColor Yellow
    $DraftOutput = "output/${MetricID}_draft/planner_plan.json"
    
    # Run bin/planner.ts generate
    cmd /c npx ts-node bin/planner.ts generate --concern $MetricID --output $DraftOutput
    
    # Check if plan was created (tolerate partial LLM failures in S5 if plan exists)
    if (-not (Test-Path $DraftOutput)) { 
        throw "Plan Generation Failed: Output file not created." 
    }
    Write-Host "   ✅ Logic Drafted. Prompts ready." -ForegroundColor Green

    # -----------------------------------------------------------------------------
    # STEP 2: QUALITY STRATEGY
    # -----------------------------------------------------------------------------
    Write-Host "`n2. [QUALITY STRATEGY] Mapping prompt logic to test requirements..." -ForegroundColor Yellow
    
    if (-not (Test-Path "flywheel/dataset/batch_strategies.metadata.json")) {
        throw "Quality Strategy metadata not found. Cannot proceed without testing rules."
    }
    Write-Host "   ✅ Strategy Loaded. Battle scenarios defined." -ForegroundColor Green

    # -----------------------------------------------------------------------------
    # STEP 3: TEST CASE GENERATION
    # -----------------------------------------------------------------------------
    Write-Host "`n3. [TEST CASE GENERATION] Creating specific battle narratives..." -ForegroundColor Yellow
    
    cmd /c npx ts-node flywheel/dataset/generate.ts run $MetricID
    
    if ($LASTEXITCODE -ne 0) { throw "Test Case Generation Failed" }
    Write-Host "   ✅ Test cases generated." -ForegroundColor Green

    # -----------------------------------------------------------------------------
    # STEP 4: BATTLE TEST (EVALUATION)
    # -----------------------------------------------------------------------------
    Write-Host "`n4. [BATTLE TEST] Running adversarial evaluation..." -ForegroundColor Yellow

    $BatchID = "${MetricID}_batch_1"
    
    cmd /c npm run planner eval -- --metric $MetricID --batch $BatchID
    
    if ($LASTEXITCODE -ne 0) { 
        Write-Host "`nFAIL: BATTLE LOST. The prompt failed to handle the edge cases." -ForegroundColor Red
        
        # PROMPT OPTIMIZER LOOP (The Self-Healing Logic)
        Write-Host "`n🔄 STARTING PROMPT OPTIMIZER LOOP..." -ForegroundColor Cyan
        
        # Find the report
        $ReportFile = Get-ChildItem "output/eval" -Filter "${MetricID}_${BatchID}_*.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        
        if ($ReportFile) {
            Write-Host "   🧠 Analyzing report: $($ReportFile.Name)..." -ForegroundColor Gray
            cmd /c npx ts-node tools/refine.ts --report $ReportFile.FullName --task signal_enrichment
            
            Write-Host "`n   ✅ OPTIMIZATION COMPLETE. Review 'optimized_prompt.json' in output folder." -ForegroundColor Green
            Write-Host "   ACTION: Apply the changes and re-run this script."
        } else {
            Write-Warning "   Could not find Eval Report to analyze."
        }
        
        exit 1 
    }

    Write-Host "`nSUCCESS: BATTLE WON. The prompt survived the gauntlet!" -ForegroundColor Cyan
    Write-Host "   ACTION: Ready for Certification."

}
catch {
    Write-Error "Pipeline Failed: $_"
    exit 1
}
finally {
    Set-Location $RootPath
}