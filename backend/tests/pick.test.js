/**
 * tests/pick.test.js
 * Unit tests for the mass-assignment whitelist helper.
 */

const { pick } = require('../utils/pick');

describe('pick', () => {
  test('keeps only whitelisted keys', () => {
    const result = pick({ nom: 'Club', role: 'admin', club_id: 99 }, ['nom']);
    expect(result).toEqual({ nom: 'Club' });
  });

  test('drops keys not present in the whitelist even if attacker-supplied', () => {
    const body = { nom: 'Test', club_id: 2, id: 1, role: 'admin' };
    const result = pick(body, ['nom']);
    expect(result.club_id).toBeUndefined();
    expect(result.id).toBeUndefined();
    expect(result.role).toBeUndefined();
  });

  test('omits keys that are undefined so partial updates do not null out other fields', () => {
    const result = pick({ prix: 50 }, ['nom', 'prix', 'description']);
    expect(result).toEqual({ prix: 50 });
    expect('nom' in result).toBe(false);
    expect('description' in result).toBe(false);
  });

  test('keeps falsy-but-defined values (false, 0, empty string)', () => {
    const result = pick({ actif: false, prix: 0, nom: '' }, ['actif', 'prix', 'nom']);
    expect(result).toEqual({ actif: false, prix: 0, nom: '' });
  });

  test('returns an empty object for empty/missing source', () => {
    expect(pick(undefined, ['nom'])).toEqual({});
    expect(pick({}, ['nom'])).toEqual({});
  });
});
