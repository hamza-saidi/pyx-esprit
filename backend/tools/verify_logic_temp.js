const { Op } = require('sequelize');

function checkEmpty(obj) {
  return obj && (Object.keys(obj).length > 0 || Object.getOwnPropertySymbols(obj).length > 0);
}

const whereWithSymbol = { [Op.and]: [{ actif: true }] };
const whereEmpty = {};
const whereNull = null;

console.log('--- Symbol Check Simulation ---');
console.log('whereWithSymbol is not empty:', !!checkEmpty(whereWithSymbol));
console.log('whereEmpty is not empty:', !!checkEmpty(whereEmpty));
console.log('whereNull is not empty:', !!checkEmpty(whereNull));

if (
  checkEmpty(whereWithSymbol) === true &&
  checkEmpty(whereEmpty) === false &&
  !checkEmpty(whereNull)
) {
  console.log('\nLOGIC VERIFIED');
} else {
  console.log('\nLOGIC FAILED');
}
process.exit();
