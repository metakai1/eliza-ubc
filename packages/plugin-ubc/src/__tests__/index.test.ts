import ubcPlugin from '../index';

describe('UBC Plugin', () => {
  it('should export a valid plugin', () => {
    expect(ubcPlugin).toBeDefined();
    expect(ubcPlugin.name).toBe('ubc-plugin');
    expect(Array.isArray(ubcPlugin.actions)).toBe(true);
    expect(Array.isArray(ubcPlugin.evaluators)).toBe(true);
    expect(Array.isArray(ubcPlugin.providers)).toBe(true);
    expect(Array.isArray(ubcPlugin.services)).toBe(true);
  });
});