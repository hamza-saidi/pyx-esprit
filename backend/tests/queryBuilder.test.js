/**
 * tests/queryBuilder.test.js
 * Unit tests for queryBuilder utility.
 */

const { buildContactQueryFromCriteria } = require('../utils/queryBuilder');
const { Op } = require('sequelize');
const { runWithTenant } = require('../utils/tenantContext');

describe('queryBuilder - buildContactQueryFromCriteria', () => {
  test('should return default values when criteria is empty or null', () => {
    const result = buildContactQueryFromCriteria(null);
    expect(result).toEqual({
      where: { actif: true },
      include: [],
    });

    const resultEmptyObj = buildContactQueryFromCriteria({});
    expect(resultEmptyObj).toEqual({
      where: { actif: true },
      include: [],
    });
  });

  test('should parse JSON string criteria correctly', () => {
    const jsonStr = JSON.stringify({ ville: 'Paris' });
    const result = buildContactQueryFromCriteria(jsonStr);
    expect(result.where).toEqual({
      actif: true,
      ville: 'Paris',
    });
  });

  test('should normalize gender filters for males and females', () => {
    // Male test cases
    const maleInputs = ['Homme', 'h', 'male', 'masculin'];
    maleInputs.forEach((input) => {
      const result = buildContactQueryFromCriteria({ sexe: input });
      expect(result.where.sexe).toEqual({
        [Op.in]: ['Homme', 'H', 'M', 'Male', 'Masculin'],
      });
    });

    // Female test cases
    const femaleInputs = ['Femme', 'f', 'female', 'féminin'];
    femaleInputs.forEach((input) => {
      const result = buildContactQueryFromCriteria({ sexe: input });
      expect(result.where.sexe).toEqual({
        [Op.in]: ['Femme', 'F', 'Female', 'Feminin', 'Féminin'],
      });
    });

    // Other test cases
    const otherResult = buildContactQueryFromCriteria({ sexe: 'autre' });
    expect(otherResult.where.sexe).toBe('Autre');
  });

  test('should build equality conditions for valid fields', () => {
    const criteria = {
      ville: 'Nice',
      type_client: 'membre',
      nationalite: 'Française',
      source: 'web',
    };
    const result = buildContactQueryFromCriteria(criteria);
    expect(result.where).toEqual({
      actif: true,
      ville: 'Nice',
      type_client: 'membre',
      nationalite: 'Française',
      source: 'web',
    });
  });

  test('should build handicap range filter correctly', () => {
    // Min handicap only
    const resultMin = buildContactQueryFromCriteria({ handicap_min: 10 });
    expect(resultMin.where.handicap).toEqual({
      [Op.gte]: 10,
    });

    // Max handicap only
    const resultMax = buildContactQueryFromCriteria({ handicap_max: 24 });
    expect(resultMax.where.handicap).toEqual({
      [Op.lte]: 24,
    });

    // Both min and max handicap
    const resultRange = buildContactQueryFromCriteria({ handicap_min: 10, handicap_max: 24 });
    expect(resultRange.where.handicap).toEqual({
      [Op.gte]: 10,
      [Op.lte]: 24,
    });
  });

  test('should handle arrays in equality fields correctly', () => {
    const criteria = {
      ville: ['Paris', 'Lyon', 'Marseille'],
    };
    const result = buildContactQueryFromCriteria(criteria);
    expect(result.where.ville).toEqual({
      [Op.in]: ['Paris', 'Lyon', 'Marseille'],
    });
  });

  test('should throw a fail-secure error for engagement criteria with no tenant context', () => {
    expect(() => buildContactQueryFromCriteria({ engagement: 'opened' })).toThrow(
      /TENANT_CONTEXT_MISSING/
    );
  });

  test('should build an Op.in subquery scoped to the club for "opened"/"clicked"', () => {
    runWithTenant({ clubId: 7, isSystem: false }, () => {
      const result = buildContactQueryFromCriteria({ engagement: 'opened' });
      expect(result.where.id[Op.in]).toBeDefined();
      const sql = result.where.id[Op.in].val;
      expect(sql).toContain('date_ouverture IS NOT NULL');
      expect(sql).toContain('club_id = 7');
      expect(sql).not.toContain('Op.notIn');
    });

    runWithTenant({ clubId: 3, isSystem: false }, () => {
      const result = buildContactQueryFromCriteria({ engagement: 'clicked' });
      const sql = result.where.id[Op.in].val;
      expect(sql).toContain('date_clic IS NOT NULL');
      expect(sql).toContain('club_id = 3');
    });
  });

  test('should build an Op.notIn subquery for "not_opened"/"not_clicked"', () => {
    runWithTenant({ clubId: 1, isSystem: false }, () => {
      const result = buildContactQueryFromCriteria({ engagement: 'not_opened' });
      expect(result.where.id[Op.notIn]).toBeDefined();
      expect(result.where.id[Op.notIn].val).toContain('date_ouverture IS NOT NULL');
    });
  });

  test('should skip the club_id clause for system (cross-club) tenant context', () => {
    runWithTenant({ clubId: null, isSystem: true }, () => {
      const result = buildContactQueryFromCriteria({ engagement: 'opened' });
      expect(result.where.id[Op.in].val).not.toContain('club_id');
    });
  });

  test('should filter subscriptions expiring N days from now (positive = before expiry)', () => {
    runWithTenant({ clubId: 1, isSystem: false }, () => {
      const before = buildContactQueryFromCriteria({ abonnement_jours_avant_expiration: 0 });
      const after30 = buildContactQueryFromCriteria({ abonnement_jours_avant_expiration: 30 });

      expect(after30.where.statut_abonnement).toBe('actif');
      const { [Op.gte]: gte, [Op.lte]: lte } = after30.where.date_expiration_abonnement;
      expect(gte).toBeInstanceOf(Date);
      expect(lte).toBeInstanceOf(Date);
      // Same single calendar day: the gte/lte window spans just under 24h.
      expect(lte.getTime() - gte.getTime()).toBeCloseTo(24 * 60 * 60 * 1000 - 1000, -2);
      // 30 days out lands on a later day than 0 days out.
      expect(after30.where.date_expiration_abonnement[Op.gte].getTime()).toBeGreaterThan(
        before.where.date_expiration_abonnement[Op.gte].getTime()
      );
    });
  });

  test('should filter expired subscriptions N days after expiry (negative)', () => {
    runWithTenant({ clubId: 1, isSystem: false }, () => {
      const today = buildContactQueryFromCriteria({ abonnement_jours_avant_expiration: 0 });
      const after5DaysPast = buildContactQueryFromCriteria({
        abonnement_jours_avant_expiration: -5,
      });

      expect(after5DaysPast.where.statut_abonnement).toBe('expiré');
      // -5 days lands on an earlier day than today (0).
      expect(after5DaysPast.where.date_expiration_abonnement[Op.gte].getTime()).toBeLessThan(
        today.where.date_expiration_abonnement[Op.gte].getTime()
      );
    });
  });
});
