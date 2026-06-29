// Whitelist helper to prevent mass assignment: only copies keys that are both
// listed and actually present (not undefined) on the source object, so partial
// updates never null out fields the caller didn't send.
function pick(source, keys) {
  const result = {};
  for (const key of keys) {
    if (source && source[key] !== undefined) {
      result[key] = source[key];
    }
  }
  return result;
}

module.exports = { pick };
