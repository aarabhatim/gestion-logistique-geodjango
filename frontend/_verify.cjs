const parser = require('@babel/parser');
const fs = require('fs');

const files = [
  'src/App.jsx',
  'src/contexts/ThemeContext.jsx',
  'src/contexts/I18nContext.jsx',
  'src/contexts/AuthContext.jsx',
  'src/stores/cartStore.js',
  'src/components/Header.jsx',
  'src/components/ChatbotWidget.jsx',
  'src/services/api.js',
  'src/pages/admin/SettingsPage.jsx',
  'src/pages/client/ClientDashboard.jsx',
];

const opts = { sourceType: 'module', plugins: ['jsx', 'objectRestSpread'] };
let errors = 0;
for (const f of files) {
  try {
    if (!fs.existsSync(f)) { console.log('MISS', f); errors++; continue; }
    const code = fs.readFileSync(f, 'utf8');
    parser.parse(code, opts);
    console.log('OK  ', f);
  } catch (e) {
    console.log('FAIL', f, '\n     ', e.message.split('\n')[0]);
    errors++;
  }
}
process.exit(errors > 0 ? 1 : 0);
