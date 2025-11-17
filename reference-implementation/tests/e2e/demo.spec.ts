/**
 * Frontend E2E Test - Real Multi-Page Application Flow
 *
 * Prerequisites:
 * 1. Backend running on http://localhost:8000 with APP_MODE=demo
 * 2. Frontend running on http://localhost:3000
 *
 * This test verifies the actual production application workflow:
 * - Multi-page navigation with React Router
 * - Domain switching via button dropdown (not <select>)
 * - Case selection via clickable cards (not <select>)
 * - Navigation to /case/:patientId route
 * - Patient summary and signals rendering
 * - LLM Q&A panel interaction
 * - Feedback submission
 * - Backend API integration
 *
 * Run with:
 *   npx playwright test
 *   npx playwright test --headed
 *   npx playwright test --ui
 */

import { test, expect } from '@playwright/test';

test.describe('CA Factory Demo Pipeline E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app home page (case list)
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('complete demo workflow: domain switch → select case → view details → ask question → submit feedback', async ({ page }) => {
    // STEP 1: Verify we're on the case list page
    await expect(page).toHaveURL('/');

    // STEP 2: Switch to CLABSI domain (if not already selected)

    // Click the domain switcher toggle (use .first() to handle mobile + desktop versions)
    const domainToggle = page.getByTestId('domain-switcher-toggle').first();
    await domainToggle.waitFor({ state: 'visible', timeout: 5000 });

    // Check if dropdown exists (might already be open)
    const domainOption = page.getByTestId('domain-option-clabsi').first();
    const isDropdownVisible = await domainOption.isVisible().catch(() => false);

    if (!isDropdownVisible) {
      // Open the domain dropdown
      await domainToggle.click();
      await domainOption.waitFor({ state: 'visible', timeout: 2000 });
    }

    // Select CLABSI if not already active (disabled means it's already selected)
    const isDisabled = await domainOption.isDisabled();
    if (!isDisabled) {
      await domainOption.click();
      // Wait for potential domain change to complete
      await page.waitForTimeout(1000);
    } else {
      // Already selected, just close the dropdown
      await page.keyboard.press('Escape');
    }

    // STEP 3: Select a case card

    // Wait for case cards to load
    const caseCards = page.getByTestId('case-card');
    await caseCards.first().waitFor({ state: 'visible', timeout: 10000 });

    const cardCount = await caseCards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Click the first case card
    await caseCards.first().click();

    // Verify navigation to case view page
    await expect(page).toHaveURL(/\/case\/.+/);

    // STEP 4: Verify patient summary and signals render

    // Wait for patient summary
    const patientSummary = page.getByTestId('patient-summary');
    await patientSummary.waitFor({ state: 'visible', timeout: 10000 });

    // Verify signals panel
    const signalList = page.getByTestId('signal-list');
    await signalList.waitFor({ state: 'visible', timeout: 5000 });

    // STEP 5: Ask the LLM a question

    // Locate LLM input
    const llmInput = page.getByTestId('llm-question-input');
    await llmInput.waitFor({ state: 'visible', timeout: 5000 });

    // Type question
    const question = 'What is the infection status?';
    await llmInput.fill(question);

    // Click submit button
    const submitButton = page.getByTestId('llm-submit-button');
    await submitButton.click();

    // Wait for response to appear
    const llmResponse = page.getByTestId('llm-response');
    await llmResponse.waitFor({ state: 'visible', timeout: 15000 });

    // Verify response has content
    const responseText = await llmResponse.textContent();
    expect(responseText).toBeTruthy();
    expect(responseText!.length).toBeGreaterThan(10);

    // STEP 6: Submit feedback

    // Find and click thumbs up button
    const thumbsUpButton = page.getByTestId('feedback-up');
    await thumbsUpButton.waitFor({ state: 'visible', timeout: 5000 });
    await thumbsUpButton.click();

    // Wait a moment for submission
    await page.waitForTimeout(1000);
  });

  test('verify backend API endpoints respond correctly', async ({ request }) => {

    // Test 1: Context endpoint
    const contextResponse = await request.post('http://localhost:8000/api/demo/context', {
      data: {
        domain_id: 'clabsi',
        case_id: 'case-001'
      }
    });

    expect(contextResponse.status()).toBe(200);
    const contextData = await contextResponse.json();
    expect(contextData.success).toBe(true);
    expect(contextData.data).toBeDefined();
    expect(contextData.data.context_fragments).toBeDefined();

    // Test 2: Abstract endpoint (requires context fragments from step 1)
    const abstractResponse = await request.post('http://localhost:8000/api/demo/abstract', {
      data: {
        domain_id: 'clabsi',
        case_id: 'case-001',
        context_fragments: contextData.data.context_fragments
      }
    });

    expect(abstractResponse.status()).toBe(200);
    const abstractData = await abstractResponse.json();
    expect(abstractData.success).toBe(true);
    expect(abstractData.data.summary).toBeDefined();
    expect(abstractData.data.criteria_evaluation).toBeDefined();

    // Test 3: Feedback endpoint
    const feedbackResponse = await request.post('http://localhost:8000/api/demo/feedback', {
      data: {
        domain_id: 'clabsi',
        case_id: 'case-001',
        feedback_type: 'thumbs_up',
        comment: 'Test feedback from Playwright E2E'
      }
    });

    expect(feedbackResponse.status()).toBe(200);
    const feedbackData = await feedbackResponse.json();
    expect(feedbackData.success).toBe(true);
    expect(feedbackData.data.feedback_id).toBeDefined();
  });

  test('error handling: invalid case ID returns proper error structure', async ({ request }) => {

    const response = await request.post('http://localhost:8000/api/demo/context', {
      data: {
        domain_id: 'clabsi',
        case_id: 'case-999'  // Invalid case
      }
    });

    // Should return 404 for invalid case
    expect(response.status()).toBe(404);

    const data = await response.json();

    // Verify error response structure matches backend format
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
    expect(data.error.code).toBe('HTTP_ERROR');
    expect(data.error.message).toContain('not found');

    // Verify metadata exists
    expect(data.metadata).toBeDefined();
    expect(data.metadata.request_id).toBeDefined();
    expect(data.metadata.timestamp).toBeDefined();
  });

  test('navigation: case list → case view → back to list', async ({ page }) => {

    // Start on case list
    await expect(page).toHaveURL('/');

    // Click first case card
    const firstCard = page.getByTestId('case-card').first();
    await firstCard.waitFor({ state: 'visible' });
    await firstCard.click();

    // Should navigate to case view
    await expect(page).toHaveURL(/\/case\/.+/);

    // Click back button
    const backButton = page.locator('button:has-text("Back to Cases")');
    await backButton.click();

    // Should return to case list
    await expect(page).toHaveURL('/');
  });
});
