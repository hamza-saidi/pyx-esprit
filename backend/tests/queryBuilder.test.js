/**
 * tests/queryBuilder.test.js
 * Unit tests for queryBuilder utility.
 */

const { buildContactQueryFromCriteria } = require('../utils/queryBuilder');
const { Op } = require('sequelize');

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
});
