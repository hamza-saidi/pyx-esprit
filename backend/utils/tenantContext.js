/**
 * utils/tenantContext.js
 *
 * Request-scoped tenant context, backed by AsyncLocalStorage so it survives
 * across async/await without having to thread clubId through every function
 * call. Read by models/hooks/tenantScopeHooks.js to scope every Sequelize
 * query to the current club - see middleware/tenantScope.js for how the
 * context gets populated from the JWT on each HTTP request.
 */

const { AsyncLocalStorage } = require('node:async_hooks');

const tenantStorage = new AsyncLocalStorage();

/**
 * @param {{ clubId: number|null, isSystem?: boolean, userId?: number, role?: string }} context
 * @param {Function} fn
 */
function runWithTenant(context, fn) {
  return tenantStorage.run(context, fn);
}

function getTenantContext() {
  return tenantStorage.getStore();
}

module.exports = { runWithTenant, getTenantContext };
