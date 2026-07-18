import { test } from 'node:test';
import assert from 'node:assert';

/**
 * RED Phase: Expect 401 Unauthorized for a protected endpoint when no token is provided.
 * Note: Assumes server is running or will be started in the GREEN phase.
 */
test('Health endpoint should require authentication', async (t) => {
  try {
     const resp = await fetch('http://localhost:8001/health');
     assert.strictEqual(resp.status, 401, 'Status should be 401 Unauthorized');
  } catch (err) {
     // If server is not running, we count this as a failure anyway (RED state)
     assert.fail(`Could not connect to server: ${err}`);
  }
});
