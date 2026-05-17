const parser = require('@babel/parser');
const fs = require('fs');

const files = [
  'src/stores/cartStore.js',
  'src/components/ChatbotWidget.jsx',
  'src/pages/client/ClientDashboard.jsx',
  'src/pages/chauffeur/ChauffeurDashboard.jsx',
  'src/pages/Dashboard.jsx',
  'src/pages/Clients.jsx',
  'src/App.jsx',
];

const opts = {
  sourceType: 'module',
  plugins: ['jsx', 'objectRestSpread', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator', 'topLevelAwait'],
};

let errors = 0;
for (const f of files) {
  try {
    const code = fs.readFileSync(f, 'utf8');
    parser.parse(code, opts);
    console.log('OK  ', f);
  } catch (e) {
    console.log('FAIL', f);
    console.log('     ', e.message);
    errors++;
  }
}
process.exit(errors > 0 ? 1 : 0);
