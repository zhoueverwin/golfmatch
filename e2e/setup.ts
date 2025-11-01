// E2E test setup file
// This file is run before each test file
import { device } from 'detox';

beforeAll(async () => {
  await device.launchApp({ newInstance: true });
});

afterAll(async () => {
  await device.terminateApp();
});
