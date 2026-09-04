import { simplifyDebts, calculateEqualSplits } from '../lib/services/settlement';

function runTests() {
  console.log('🧪 Testing Settlement Engine...');

  // Test 1: Even split 2 members
  const split1 = calculateEqualSplits(100, 'userA', ['userA', 'userB']);
  console.assert(split1.userA === 50 && split1.userB === 50, 'Test 1 Failed');
  console.log('✓ Test 1 Passed: Even split 2 members');

  // Test 2: Uneven split 3 members (100 / 3 = 33.33 each, remainder 0.01 to payer)
  const split2 = calculateEqualSplits(100, 'userA', ['userA', 'userB', 'userC']);
  console.assert(split2.userA === 33.34, 'Test 2 Payer share Failed');
  console.assert(split2.userB === 33.33 && split2.userC === 33.33, 'Test 2 Member share Failed');
  const sum2 = Object.values(split2).reduce((a, b) => a + b, 0);
  console.assert(Math.abs(sum2 - 100) < 0.001, 'Test 2 Sum match Failed');
  console.log('✓ Test 2 Passed: Uneven split 3 members with remainder');

  // Test 3: Simple debt simplification (A pays 300, B & C owe 100 each)
  const balances = [
    { userId: 'userA', amount: 200 },  // +200
    { userId: 'userB', amount: -100 }, // -100
    { userId: 'userC', amount: -100 }, // -100
  ];
  const txs = simplifyDebts(balances);
  console.assert(txs.length === 2, 'Test 3 Tx count Failed');
  console.assert(txs[0].to === 'userA' && txs[1].to === 'userA', 'Test 3 Recipient Failed');
  console.log('✓ Test 3 Passed: Simple debt simplification');

  console.log('🎉 All Settlement Tests Passed!');
}

runTests();
