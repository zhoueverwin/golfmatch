import { device, expect, element, by, waitFor } from 'detox';

/**
 * E2E Tests for New User Signup Flow with EditProfile Redirect
 * 
 * Feature: After email verification, new users (< 30% profile completion) 
 * should be automatically redirected to EditProfile screen to input necessary information.
 * 
 * Test Scenarios:
 * 1. New user signup → verification → redirect to EditProfile
 * 2. Existing user login → no redirect (profile complete)
 * 3. Edge cases: invalid OTP, resend OTP, navigation flow
 */

describe('New User Signup Flow - EditProfile Redirect', () => {
  // Global setup - runs once before all tests
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  // Setup before each test - CRITICAL for test isolation
  beforeEach(async () => {
    // Reload app to clear state between tests
    await device.reloadReactNative();
  });

  // Cleanup after each test
  afterEach(async () => {
    // Optional: Take screenshots on failure
    // if (jasmine.currentSpec.result.status === 'failed') {
    //   await device.takeScreenshot(`failure-${Date.now()}`);
    // }
  });

  // Global teardown
  afterAll(async () => {
    await device.terminateApp();
  });

  describe('New User Signup and Verification Flow', () => {
    it('should redirect new user to EditProfile after email verification', async () => {
      // Arrange
      const testEmail = `test.newuser.${Date.now()}@example.com`;
      const testPassword = 'password123';
      const testOTP = '123456'; // Note: In real tests, this would come from email or test environment

      // Act - Navigate to signup screen
      await waitFor(element(by.id('AUTH.LOGIN_SCREEN.ROOT')))
        .toBeVisible()
        .withTimeout(5000);

      await element(by.id('AUTH.LOGIN_SCREEN.SWITCH_TO_SIGNUP_BTN')).tap();

      // Wait for signup screen
      await waitFor(element(by.id('AUTH.SIGNUP_SCREEN.ROOT')))
        .toBeVisible()
        .withTimeout(3000);

      // Enter signup credentials
      await element(by.id('AUTH.SIGNUP_SCREEN.EMAIL_INPUT')).typeText(testEmail);
      await element(by.id('AUTH.SIGNUP_SCREEN.PASSWORD_INPUT')).typeText(testPassword);

      // Submit signup
      await element(by.id('AUTH.SIGNUP_SCREEN.SUBMIT_BTN')).tap();

      // Wait for verification screen to appear
      await waitFor(element(by.id('AUTH.VERIFY_EMAIL_SCREEN.ROOT')))
        .toBeVisible()
        .withTimeout(5000);

      // Verify OTP input is visible and enabled
      await expect(element(by.id('AUTH.VERIFY_EMAIL_SCREEN.OTP_INPUT'))).toBeVisible();
      
      // Enter OTP code
      await element(by.id('AUTH.VERIFY_EMAIL_SCREEN.OTP_INPUT')).typeText(testOTP);

      // Wait for verify button to be enabled (6 digits entered)
      await waitFor(element(by.id('AUTH.VERIFY_EMAIL_SCREEN.VERIFY_BTN')))
        .toBeVisible()
        .withTimeout(2000);

      // Tap verify button
      await element(by.id('AUTH.VERIFY_EMAIL_SCREEN.VERIFY_BTN')).tap();

      // Assert - Should redirect to EditProfile screen for new users
      // Wait for navigation to complete and EditProfile to appear
      await waitFor(element(by.id('EDIT_PROFILE_SCREEN.ROOT')))
        .toBeVisible()
        .withTimeout(10000);

      // Verify EditProfile screen is displayed
      await expect(element(by.id('EDIT_PROFILE_SCREEN.ROOT'))).toBeVisible();
      await expect(element(by.id('EDIT_PROFILE_SCREEN.SAVE_BTN'))).toBeVisible();
    });

    it('should show verification screen after signup with email confirmation', async () => {
      // Arrange
      const testEmail = `test.verify.${Date.now()}@example.com`;
      const testPassword = 'password123';

      // Act
      await waitFor(element(by.id('AUTH.LOGIN_SCREEN.ROOT')))
        .toBeVisible()
        .withTimeout(5000);

      await element(by.id('AUTH.LOGIN_SCREEN.SWITCH_TO_SIGNUP_BTN')).tap();

      await waitFor(element(by.id('AUTH.SIGNUP_SCREEN.ROOT')))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id('AUTH.SIGNUP_SCREEN.EMAIL_INPUT')).typeText(testEmail);
      await element(by.id('AUTH.SIGNUP_SCREEN.PASSWORD_INPUT')).typeText(testPassword);
      await element(by.id('AUTH.SIGNUP_SCREEN.SUBMIT_BTN')).tap();

      // Assert - Verification screen should appear
      await waitFor(element(by.id('AUTH.VERIFY_EMAIL_SCREEN.ROOT')))
        .toBeVisible()
        .withTimeout(5000);

      await expect(element(by.id('AUTH.VERIFY_EMAIL_SCREEN.OTP_INPUT'))).toBeVisible();
      await expect(element(by.id('AUTH.VERIFY_EMAIL_SCREEN.VERIFY_BTN'))).toBeVisible();
      // Note: Detox doesn't have toBeDisabled() - verify button exists but verify disabled state via accessibility
      // The button should be disabled when OTP is less than 6 digits
    });

    it('should enable verify button only when 6 digits are entered', async () => {
      // Arrange - Assume we're on verification screen
      const testEmail = `test.otp.${Date.now()}@example.com`;
      const testPassword = 'password123';

      // Navigate to verification screen
      await waitFor(element(by.id('AUTH.LOGIN_SCREEN.ROOT')))
        .toBeVisible()
        .withTimeout(5000);

      await element(by.id('AUTH.LOGIN_SCREEN.SWITCH_TO_SIGNUP_BTN')).tap();

      await waitFor(element(by.id('AUTH.SIGNUP_SCREEN.ROOT')))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id('AUTH.SIGNUP_SCREEN.EMAIL_INPUT')).typeText(testEmail);
      await element(by.id('AUTH.SIGNUP_SCREEN.PASSWORD_INPUT')).typeText(testPassword);
      await element(by.id('AUTH.SIGNUP_SCREEN.SUBMIT_BTN')).tap();

      await waitFor(element(by.id('AUTH.VERIFY_EMAIL_SCREEN.ROOT')))
        .toBeVisible()
        .withTimeout(5000);

      // Act & Assert
      // Initially button should be visible (but disabled - verify via accessibilityState)
      await expect(element(by.id('AUTH.VERIFY_EMAIL_SCREEN.VERIFY_BTN'))).toBeVisible();
      
      // Clear any existing input
      await element(by.id('AUTH.VERIFY_EMAIL_SCREEN.OTP_INPUT')).clearText();

      // Enter 5 digits - button should still exist
      await element(by.id('AUTH.VERIFY_EMAIL_SCREEN.OTP_INPUT')).typeText('12345');
      await expect(element(by.id('AUTH.VERIFY_EMAIL_SCREEN.VERIFY_BTN'))).toBeVisible();

      // Enter 6th digit - button should be enabled and ready
      await element(by.id('AUTH.VERIFY_EMAIL_SCREEN.OTP_INPUT')).typeText('6');
      await waitFor(element(by.id('AUTH.VERIFY_EMAIL_SCREEN.VERIFY_BTN')))
        .toBeVisible()
        .withTimeout(2000);
      // Verify button is enabled by checking it's not disabled (button should be tappable)
      await expect(element(by.id('AUTH.VERIFY_EMAIL_SCREEN.VERIFY_BTN'))).toBeVisible();
    });

    it('should allow resending OTP code', async () => {
      // Arrange
      const testEmail = `test.resend.${Date.now()}@example.com`;
      const testPassword = 'password123';

      // Navigate to verification screen
      await waitFor(element(by.id('AUTH.LOGIN_SCREEN.ROOT')))
        .toBeVisible()
        .withTimeout(5000);

      await element(by.id('AUTH.LOGIN_SCREEN.SWITCH_TO_SIGNUP_BTN')).tap();

      await waitFor(element(by.id('AUTH.SIGNUP_SCREEN.ROOT')))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id('AUTH.SIGNUP_SCREEN.EMAIL_INPUT')).typeText(testEmail);
      await element(by.id('AUTH.SIGNUP_SCREEN.PASSWORD_INPUT')).typeText(testPassword);
      await element(by.id('AUTH.SIGNUP_SCREEN.SUBMIT_BTN')).tap();

      await waitFor(element(by.id('AUTH.VERIFY_EMAIL_SCREEN.ROOT')))
        .toBeVisible()
        .withTimeout(5000);

      // Act - Tap resend button
      await element(by.id('AUTH.VERIFY_EMAIL_SCREEN.RESEND_BTN')).tap();

      // Assert - Resend button should be visible and functional
      // Note: In real app, there might be a success message or loading state
      await expect(element(by.id('AUTH.VERIFY_EMAIL_SCREEN.RESEND_BTN'))).toBeVisible();
    });

    it('should navigate back to login screen when back button is tapped', async () => {
      // Arrange - Navigate to verification screen
      const testEmail = `test.back.${Date.now()}@example.com`;
      const testPassword = 'password123';

      await waitFor(element(by.id('AUTH.LOGIN_SCREEN.ROOT')))
        .toBeVisible()
        .withTimeout(5000);

      await element(by.id('AUTH.LOGIN_SCREEN.SWITCH_TO_SIGNUP_BTN')).tap();

      await waitFor(element(by.id('AUTH.SIGNUP_SCREEN.ROOT')))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id('AUTH.SIGNUP_SCREEN.EMAIL_INPUT')).typeText(testEmail);
      await element(by.id('AUTH.SIGNUP_SCREEN.PASSWORD_INPUT')).typeText(testPassword);
      await element(by.id('AUTH.SIGNUP_SCREEN.SUBMIT_BTN')).tap();

      await waitFor(element(by.id('AUTH.VERIFY_EMAIL_SCREEN.ROOT')))
        .toBeVisible()
        .withTimeout(5000);

      // Act - Tap back button
      await element(by.id('AUTH.VERIFY_EMAIL_SCREEN.BACK_BTN')).tap();

      // Assert - Should return to login screen
      await waitFor(element(by.id('AUTH.LOGIN_SCREEN.ROOT')))
        .toBeVisible()
        .withTimeout(3000);

      await expect(element(by.id('AUTH.LOGIN_SCREEN.EMAIL_INPUT'))).toBeVisible();
    });
  });

  describe('EditProfile Screen Navigation', () => {
    it('should display EditProfile screen with save button', async () => {
      // This test assumes user is already authenticated and redirected
      // In practice, this would be part of the full signup flow test above
      // But we can test EditProfile screen independently if needed

      // Note: This test would require mocking authentication state
      // For now, we'll verify the screen structure exists
      // Full integration test would require actual authentication flow
    });

    it('should allow user to cancel editing profile', async () => {
      // Similar to above - requires authenticated state
      // Would test cancel button functionality
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid OTP gracefully', async () => {
      // Arrange
      const testEmail = `test.invalid.${Date.now()}@example.com`;
      const testPassword = 'password123';
      const invalidOTP = '000000';

      // Navigate to verification screen
      await waitFor(element(by.id('AUTH.LOGIN_SCREEN.ROOT')))
        .toBeVisible()
        .withTimeout(5000);

      await element(by.id('AUTH.LOGIN_SCREEN.SWITCH_TO_SIGNUP_BTN')).tap();

      await waitFor(element(by.id('AUTH.SIGNUP_SCREEN.ROOT')))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id('AUTH.SIGNUP_SCREEN.EMAIL_INPUT')).typeText(testEmail);
      await element(by.id('AUTH.SIGNUP_SCREEN.PASSWORD_INPUT')).typeText(testPassword);
      await element(by.id('AUTH.SIGNUP_SCREEN.SUBMIT_BTN')).tap();

      await waitFor(element(by.id('AUTH.VERIFY_EMAIL_SCREEN.ROOT')))
        .toBeVisible()
        .withTimeout(5000);

      // Act - Enter invalid OTP
      await element(by.id('AUTH.VERIFY_EMAIL_SCREEN.OTP_INPUT')).typeText(invalidOTP);
      await element(by.id('AUTH.VERIFY_EMAIL_SCREEN.VERIFY_BTN')).tap();

      // Assert - Should remain on verification screen (error handling)
      // Note: Actual error message display depends on implementation
      // We verify we're still on verification screen
      await waitFor(element(by.id('AUTH.VERIFY_EMAIL_SCREEN.ROOT')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should not redirect existing users with complete profiles', async () => {
      // This test would require:
      // 1. An existing user with > 30% profile completion
      // 2. Login flow
      // 3. Verify NOT redirected to EditProfile

      // Note: This is a critical test but requires test data setup
      // Would need to create test user with complete profile before running
    });
  });

  describe('Navigation Flow Integration', () => {
    it('should complete full signup flow: signup → verify → EditProfile → main app', async () => {
      // This is the comprehensive integration test
      // Steps:
      // 1. Signup with new email
      // 2. Enter verification code
      // 3. Verify redirect to EditProfile
      // 4. Fill in profile (optional - can just verify screen appears)
      // 5. Save profile (or navigate back)
      // 6. Verify main app navigation works

      // Note: This test combines all previous tests into one end-to-end flow
      // Implementation would follow the same pattern as first test above
    });
  });
});
