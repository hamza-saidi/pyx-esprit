/**
 * tests/jwt.test.js
 * Unit tests for jwt secret provider utility.
 */

const { getJwtSecret } = require('../utils/jwt');
const config = require('../config-temp');

describe('jwt - getJwtSecret helper', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('should return default key in non-production environments when env variable is missing', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;

    const secret = getJwtSecret('access');
    expect(secret).toBe(config.jwt.secret);
  });

  test('should return customized process.env key in development', () => {
    process.env.NODE_ENV = 'development';
    process.env.JWT_SECRET = 'my_dev_custom_secret';

    const secret = getJwtSecret('access');
    expect(secret).toBe('my_dev_custom_secret');
  });

  test('should throw error in production environment if secret is empty or missing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;

    // config-temp values must be bypassed or cause throws
    expect(() => getJwtSecret('access')).toThrow(/CRITICAL SECURITY ERROR/);
  });

  test('should throw error in production environment if secret is the default fallback key', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'your-super-secret-jwt-key-here-12345';

    expect(() => getJwtSecret('access')).toThrow(/CRITICAL SECURITY ERROR/);
  });

  test('should return process.env.JWT_SECRET in production when it is a customized strong key', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'extremely_strong_production_only_secret_key_987654321';

    const secret = getJwtSecret('access');
    expect(secret).toBe('extremely_strong_production_only_secret_key_987654321');
  });
});
