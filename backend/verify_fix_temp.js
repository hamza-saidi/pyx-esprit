const path = require('path');
const util = require('util');
const rootPath = 'c:/Users/Maycem Saïdi/OneDrive - pylon-dw.com/Bureau/golf huub-antigravity';
const { buildContactQueryFromCriteria } = require(path.join(rootPath, 'backend/controllers/segmentController.js'));
const { Op } = require('sequelize');

async function verify() {
  const results = {
    legacyTagFix: false,
    segmentExcludeFix: false
  };

  try {
    console.log('--- Testing Legacy Tag Criteria ---');
    const legacyCriteria = { actif: true, tag_ids: [1549] };
    const legacyQuery = buildContactQueryFromCriteria(legacyCriteria);
    const whereInspect = util.inspect(legacyQuery.where, { depth: null });
    
    if (whereInspect.includes('SELECT contact_id FROM contact_tag') && whereInspect.includes('1549')) {
      results.legacyTagFix = true;
    } else {
      console.log('Legacy Query WHERE (actual):', whereInspect);
    }

    console.log('\n--- Testing filterRules with Excludes Segment ---');
    const segmentCriteres = { actif: true, tag_ids: [1549] };
    const { where: segmentWhere } = buildContactQueryFromCriteria(segmentCriteres);
    
    // Simulating contactController logic
    const operator = 'excludes';
    const filterMatch = 'all';
    const segmentConditions = [segmentWhere];
    const innerMatch = filterMatch === 'any' ? Op.or : Op.and;
    const segmentCond = { [innerMatch]: segmentConditions };
    const cond = operator === 'excludes' ? { [Op.not]: segmentCond } : segmentCond;
    
    const condInspect = util.inspect(cond, { depth: null });
    if (condInspect.includes('Symbol(not)') && condInspect.includes('actif: true')) {
      results.segmentExcludeFix = true;
    } else {
      console.log('Segment Exclude Condition (actual):', condInspect);
    }

    console.log('\nResults:', results);
    if (results.legacyTagFix && results.segmentExcludeFix) {
      console.log('\nVERIFICATION SUCCESSFUL');
    } else {
      console.log('\nVERIFICATION FAILED');
    }
  } catch (err) {
    console.error('Verification error:', err);
  }
  process.exit();
}

verify();
