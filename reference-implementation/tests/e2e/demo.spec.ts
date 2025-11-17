/**
 * Frontend E2E Test - Demo Pipeline
 *
 * Prerequisites:
 * 1. Backend running on http://localhost:8000 with APP_MODE=demo
 * 2. Frontend running on http://localhost:3000 (or run with `npm run dev`)
 *
 * This test verifies:
 * - UI correctly wires to backend API endpoints
 * - Domain/case selection works
 * - Patient summary and signals render
 * - LLM Q&A panel functions
 * - Feedback submission works
 * - Network calls to /api/demo/* endpoints succeed
 *
 * Run with:
 *   npx playwright test
 *   npx playwright test --ui  # For interactive mode
 *   npx playwright test --debug  # For debugging
 */

import { test, expect } from '@playwright/test';

test.describe('CA Factory Demo Pipeline E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('complete demo workflow: select domain → select case → ask question → submit feedback', async ({ page }) => {
    console.log('\n========================================');
    console.log('Running Complete Demo Workflow Test');
    console.log('========================================\n');

    // ====================================
    // STEP 1: Select CLABSI domain
    // ====================================
    console.log('[1/5] Selecting CLABSI domain...');

    // Wait for domain selector to be visible
    const domainSelector = page.locator('[data-testid="domain-selector"], select[name="domain"], #domain-select');
    await domainSelector.waitFor({ state: 'visible', timeout: 5000 });

    // Select CLABSI domain
    await domainSelector.selectOption({ label: /CLABSI/i });

    // Verify selection
    const selectedDomain = await domainSelector.inputValue();
    expect(selectedDomain.toLowerCase()).toContain('clabsi');
    console.log('✓ CLABSI domain selected');

    // ====================================
    // STEP 2: Select case-001
    // ====================================
    console.log('\n[2/5] Selecting case-001...');

    // Wait for case selector or case list to appear
    const caseSelector = page.locator(
      '[data-testid="case-selector"], select[name="case"], #case-select, ' +
      '[data-testid="case-list"] >> text=/case-001|PAT-001/i'
    );
    await caseSelector.waitFor({ state: 'visible', timeout: 5000 });

    // Try dropdown selection first, fall back to clicking card/link
    const isDropdown = await caseSelector.evaluate((el) => el.tagName === 'SELECT');
    if (isDropdown) {
      await caseSelector.selectOption({ label: /case-001|PAT-001/i });
    } else {
      await caseSelector.click();
    }

    console.log('✓ Case-001 selected');

    // ====================================
    // STEP 3: Verify patient summary and signals render
    // ====================================
    console.log('\n[3/5] Verifying patient summary and clinical signals...');

    // Wait for patient summary section
    const patientSummary = page.locator('[data-testid="patient-summary"], .patient-summary, .patient-info');
    await patientSummary.waitFor({ state: 'visible', timeout: 10000 });

    // Verify patient data is displayed
    const summaryText = await patientSummary.textContent();
    expect(summaryText).toBeTruthy();
    console.log('✓ Patient summary rendered');

    // Verify at least one clinical signal is visible
    const signals = page.locator('[data-testid="clinical-signal"], .clinical-signal, .signal-item');
    const signalCount = await signals.count();

    expect(signalCount).toBeGreaterThan(0);
    console.log(`✓ Found ${signalCount} clinical signal(s)`);

    // Get first signal text to verify it's meaningful
    if (signalCount > 0) {
      const firstSignal = await signals.first().textContent();
      expect(firstSignal).toBeTruthy();
      console.log(`  First signal: ${firstSignal?.substring(0, 50)}...`);
    }

    // ====================================
    // STEP 4: Ask LLM a question
    // ====================================
    console.log('\n[4/5] Testing LLM Q&A panel...');

    // Locate LLM input panel
    const llmInput = page.locator(
      '[data-testid="llm-input"], [data-testid="question-input"], ' +
      'textarea[placeholder*="question" i], textarea[placeholder*="ask" i], ' +
      'input[placeholder*="question" i]'
    );

    // Wait for input to be available
    await llmInput.waitFor({ state: 'visible', timeout: 5000 });

    // Type question
    const question = 'What is the infection status?';
    await llmInput.fill(question);
    console.log(`  Typed question: "${question}"`);

    // Find and click submit button
    const submitButton = page.locator(
      '[data-testid="ask-button"], [data-testid="submit-question"], ' +
      'button:has-text("Ask"), button:has-text("Submit"), button:has-text("Send")'
    );
    await submitButton.click();
    console.log('  Submitted question');

    // Listen for network request to /api/demo/context
    const contextRequest = page.waitForResponse(
      response => response.url().includes('/api/demo/context') && response.status() === 200,
      { timeout: 15000 }
    );

    // Listen for network request to /api/demo/abstract
    const abstractRequest = page.waitForResponse(
      response => response.url().includes('/api/demo/abstract') && response.status() === 200,
      { timeout: 15000 }
    );

    console.log('  Waiting for API responses...');

    // Wait for both responses
    await Promise.all([contextRequest, abstractRequest]);
    console.log('✓ API calls successful:');
    console.log('  - POST /api/demo/context (200)');
    console.log('  - POST /api/demo/abstract (200)');

    // Wait for LLM response to appear
    const llmResponse = page.locator(
      '[data-testid="llm-response"], [data-testid="answer"], ' +
      '.llm-response, .answer-text, .response-content'
    );
    await llmResponse.waitFor({ state: 'visible', timeout: 10000 });

    // Verify response has meaningful text
    const responseText = await llmResponse.textContent();
    expect(responseText).toBeTruthy();
    expect(responseText!.length).toBeGreaterThan(20);
    console.log(`✓ LLM response received (${responseText!.length} characters)`);
    console.log(`  Preview: ${responseText!.substring(0, 100)}...`);

    // ====================================
    // STEP 5: Submit feedback
    // ====================================
    console.log('\n[5/5] Submitting feedback...');

    // Find thumbs up button
    const thumbsUpButton = page.locator(
      '[data-testid="thumbs-up"], [data-testid="feedback-positive"], ' +
      'button[aria-label*="thumbs up" i], button:has-text("👍"), ' +
      '.feedback-thumbs-up, .feedback-positive'
    );

    // If thumbs up not found, try thumbs down as fallback
    const thumbsDownButton = page.locator(
      '[data-testid="thumbs-down"], [data-testid="feedback-negative"], ' +
      'button[aria-label*="thumbs down" i], button:has-text("👎"), ' +
      '.feedback-thumbs-down, .feedback-negative'
    );

    // Try thumbs up first, fall back to thumbs down
    const feedbackButton = (await thumbsUpButton.count()) > 0 ? thumbsUpButton : thumbsDownButton;
    await feedbackButton.waitFor({ state: 'visible', timeout: 5000 });

    // Listen for feedback API call
    const feedbackRequest = page.waitForResponse(
      response => response.url().includes('/api/demo/feedback') && response.status() === 200,
      { timeout: 10000 }
    );

    // Click feedback button
    await feedbackButton.click();
    console.log('  Clicked feedback button');

    // Wait for feedback API call
    const feedbackResponse = await feedbackRequest;
    expect(feedbackResponse.status()).toBe(200);
    console.log('✓ API call successful:');
    console.log('  - POST /api/demo/feedback (200)');

    // Verify response body
    const feedbackData = await feedbackResponse.json();
    expect(feedbackData.success).toBe(true);
    expect(feedbackData.data.status).toBe('ok');
    expect(feedbackData.data.feedback_id).toBeTruthy();
    console.log(`  Feedback ID: ${feedbackData.data.feedback_id}`);

    // Wait for UI feedback confirmation
    const feedbackConfirmation = page.locator(
      'text=/Saved|Feedback submitted|Thank you|Success/i'
    );

    // Check if confirmation appears (optional, might not exist in all UIs)
    const confirmationAppeared = await feedbackConfirmation.isVisible({ timeout: 3000 }).catch(() => false);
    if (confirmationAppeared) {
      const confirmationText = await feedbackConfirmation.textContent();
      console.log(`✓ UI confirmation: "${confirmationText}"`);
    } else {
      console.log('  (UI confirmation not found, but API succeeded)');
    }

    // ====================================
    // FINAL VERIFICATION
    // ====================================
    console.log('\n========================================');
    console.log('✓ ALL STEPS COMPLETED SUCCESSFULLY');
    console.log('========================================');
    console.log('\nVerified:');
    console.log('  ✓ Domain selection (CLABSI)');
    console.log('  ✓ Case selection (case-001)');
    console.log('  ✓ Patient summary rendered');
    console.log('  ✓ Clinical signals displayed');
    console.log('  ✓ LLM Q&A functional');
    console.log('  ✓ Feedback submission successful');
    console.log('\nNetwork Calls:');
    console.log('  ✓ POST /api/demo/context → 200');
    console.log('  ✓ POST /api/demo/abstract → 200');
    console.log('  ✓ POST /api/demo/feedback → 200');
    console.log('========================================\n');
  });

  test('verify all three API endpoints return 200', async ({ page }) => {
    console.log('\n Testing API endpoint responses...');

    // Navigate to app and trigger workflow
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Track all network calls
    const networkCalls = {
      context: false,
      abstract: false,
      feedback: false
    };

    // Listen for context endpoint
    page.on('response', response => {
      if (response.url().includes('/api/demo/context') && response.status() === 200) {
        networkCalls.context = true;
        console.log('✓ POST /api/demo/context returned 200');
      }
      if (response.url().includes('/api/demo/abstract') && response.status() === 200) {
        networkCalls.abstract = true;
        console.log('✓ POST /api/demo/abstract returned 200');
      }
      if (response.url().includes('/api/demo/feedback') && response.status() === 200) {
        networkCalls.feedback = true;
        console.log('✓ POST /api/demo/feedback returned 200');
      }
    });

    // Trigger the workflow (simplified version)
    // Note: Actual implementation depends on your UI structure

    // Give time for network calls to complete
    await page.waitForTimeout(2000);

    // At minimum, verify endpoints are reachable via direct API calls
    const response1 = await page.request.post('http://localhost:8000/api/demo/context', {
      data: {
        domain_id: 'clabsi',
        case_id: 'case-001'
      }
    });
    expect(response1.status()).toBe(200);
    console.log('✓ Direct API test: /api/demo/context → 200');

    const contextData = await response1.json();
    const response2 = await page.request.post('http://localhost:8000/api/demo/abstract', {
      data: {
        domain_id: 'clabsi',
        case_id: 'case-001',
        context_fragments: contextData.data.context_fragments
      }
    });
    expect(response2.status()).toBe(200);
    console.log('✓ Direct API test: /api/demo/abstract → 200');

    const response3 = await page.request.post('http://localhost:8000/api/demo/feedback', {
      data: {
        domain_id: 'clabsi',
        case_id: 'case-001',
        feedback_type: 'thumbs_up'
      }
    });
    expect(response3.status()).toBe(200);
    console.log('✓ Direct API test: /api/demo/feedback → 200');
  });

  test('error handling: invalid case ID returns 404', async ({ page }) => {
    // Test that invalid case returns appropriate error
    const response = await page.request.post('http://localhost:8000/api/demo/context', {
      data: {
        domain_id: 'clabsi',
        case_id: 'case-999'  // Invalid case
      }
    });

    expect(response.status()).toBe(404);
    console.log('✓ Invalid case correctly returns 404');
  });
});
