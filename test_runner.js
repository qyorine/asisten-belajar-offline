/**
 * test_runner.js
 * Automated test suite to verify module loading, search engine, citations, and quiz logic.
 */

const assert = require('assert');
const modulesData = require('./modules-data.js');
const Utils = require('./utils.js');
const SearchEngine = require('./search-engine.js');

console.log('--- STARTING AUTOMATED TESTS ---');

// Test 1: Module Data Integrity
assert.strictEqual(modulesData.length, 10, 'Must have exactly 10 preloaded modules');
const bioModule = modulesData.find(m => m.id === 'Modul_02_Biologi');
assert.ok(bioModule, 'Modul_02_Biologi must exist');
console.log('✓ Test 1 Passed: 10 Modules present');

// Test 2: Search Engine - HCl and Pepsin question
const query1 = 'Jelaskan fungsi asam klorida (HCl) dan pepsin dalam sistem pencernaan!';
const res1 = SearchEngine.searchModule(bioModule, query1);
assert.strictEqual(res1.found, true, 'Question 1 must be found');
assert.ok(res1.text.includes('parietal'), 'Answer must mention sel parietal');
assert.ok(res1.text.includes('pepsinogen'), 'Answer must mention pepsinogen');
assert.ok(res1.source.includes('Bab 3, Hal. 14'), 'Citation must cite Bab 3, Hal. 14');
console.log('✓ Test 2 Passed: HCl & Pepsin Q&A and Citation verified ->', res1.source);

// Test 3: Search Engine - Renin vs Pepsin question
const query2 = 'Apa itu renin dan apa bedanya dengan pepsin?';
const res2 = SearchEngine.searchModule(bioModule, query2);
assert.strictEqual(res2.found, true, 'Question 2 must be found');
assert.ok(res2.text.includes('kasein') || res2.text.includes('susu'), 'Answer must mention kasein/susu');
console.log('✓ Test 3 Passed: Renin vs Pepsin Q&A verified');

// Test 4: Search Engine - Non-hallucination for unknown questions
const unknownQuery = 'Siapa nama presiden pertama Amerika Serikat?';
const res3 = SearchEngine.searchModule(bioModule, unknownQuery);
assert.strictEqual(res3.found, false, 'Unknown query must NOT be found');
assert.ok(res3.text.includes('belum tersedia dalam materi'), 'Must state information is not yet available in materials');
console.log('✓ Test 4 Passed: Non-hallucination verified');

// Test 5: Summary Query
const resSummary = SearchEngine.searchModule(bioModule, 'Rangkum materi ini');
assert.strictEqual(resSummary.found, true, 'Summary must be found');
assert.ok(resSummary.text.length > 50, 'Summary must be substantial');
console.log('✓ Test 5 Passed: Summary generation verified');

// Test 6: Quiz Bank verification for all 10 modules
modulesData.forEach(mod => {
  assert.ok(mod.quiz && mod.quiz.length === 5, `${mod.id} must have exactly 5 questions`);
  mod.quiz.forEach((q, i) => {
    assert.strictEqual(q.options.length, 4, `${mod.id} question ${i+1} must have 4 options`);
    assert.ok(q.correctIndex >= 0 && q.correctIndex <= 3, `${mod.id} question ${i+1} must have valid correct index`);
    assert.ok(q.explanation && q.explanation.length > 10, `${mod.id} question ${i+1} must have explanation`);
  });
});
console.log('✓ Test 6 Passed: All 10 modules have exactly 5 verified 4-choice questions with valid keys and explanations');

// Test 7: Verify Biologi Question 3 matches Screenshot 2
const q3 = bioModule.quiz[2];
assert.ok(q3.question.includes('enzim lipase, amilase, dan tripsin'), 'Question 3 must match screenshot question');
assert.strictEqual(q3.options[1], 'Pankreas', 'Option B must be Pankreas');
assert.strictEqual(q3.correctIndex, 1, 'Pankreas must be correct answer');
console.log('✓ Test 7 Passed: Biologi Question 3 perfectly matches screenshot 2');

console.log('\nALL AUTOMATED TESTS PASSED SUCCESSFULLY! (7/7)');
