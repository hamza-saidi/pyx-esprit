/**
 * tests/tenantScopeHooks.test.js
 * Unit tests for the multi-tenancy fail-secure Sequelize hooks. Hooks are
 * invoked directly via Model.runHooks() so no live database is needed.
 */

const db = require('../models');
const { runWithTenant } = require('../utils/tenantContext');

describe('tenantScopeHooks', () => {
  test('beforeFind throws when no tenant context is set', async () => {
    await expect(db.Contact.runHooks('beforeFind', {})).rejects.toThrow(/TENANT_CONTEXT_MISSING/);
  });

  test('beforeFind injects club_id into an existing where clause', async () => {
    await runWithTenant({ clubId: 5, isSystem: false }, async () => {
      const options = { where: { actif: true } };
      await db.Contact.runHooks('beforeFind', options);
      expect(options.where).toEqual({ actif: true, club_id: 5 });
    });
  });

  test('beforeFind injects club_id when there is no where clause yet', async () => {
    await runWithTenant({ clubId: 3, isSystem: false }, async () => {
      const options = {};
      await db.Contact.runHooks('beforeFind', options);
      expect(options.where).toEqual({ club_id: 3 });
    });
  });

  test('isSystem context bypasses the filter entirely', async () => {
    await runWithTenant({ clubId: null, isSystem: true }, async () => {
      const options = { where: { actif: true } };
      await db.Contact.runHooks('beforeFind', options);
      expect(options.where).toEqual({ actif: true });
    });
  });

  test('beforeCreate stamps club_id from the tenant context', async () => {
    await runWithTenant({ clubId: 7, isSystem: false }, async () => {
      const instance = {};
      await db.Contact.runHooks('beforeCreate', instance);
      expect(instance.club_id).toBe(7);
    });
  });

  test('beforeCreate does not overwrite an explicitly set club_id', async () => {
    await runWithTenant({ clubId: 7, isSystem: false }, async () => {
      const instance = { club_id: 99 };
      await db.Contact.runHooks('beforeCreate', instance);
      expect(instance.club_id).toBe(99);
    });
  });

  test('beforeCreate in system context requires an explicit club_id', async () => {
    await runWithTenant({ clubId: null, isSystem: true }, async () => {
      await expect(db.Contact.runHooks('beforeCreate', {})).rejects.toThrow(/contexte système/);
    });
  });

  test("concurrent requests for different clubs never see each other's context", async () => {
    const results = await Promise.all([
      runWithTenant({ clubId: 1, isSystem: false }, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        const options = { where: {} };
        await db.Contact.runHooks('beforeFind', options);
        return options.where.club_id;
      }),
      runWithTenant({ clubId: 2, isSystem: false }, async () => {
        const options = { where: {} };
        await db.Contact.runHooks('beforeFind', options);
        return options.where.club_id;
      }),
    ]);
    expect(results).toEqual([1, 2]);
  });
});
