const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'pages', 'Accounting');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));
for (const file of files) {
    const p = path.join(dir, file);
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/className="mb-6 pb-4 border-b border-slate-200/g, 'className="hide-on-export mb-6 pb-4 border-b border-slate-200');
    content = content.replace(/className="mb-6 pb-4 border-b-2 border-slate-200/g, 'className="hide-on-export mb-6 pb-4 border-b-2 border-slate-200');
    fs.writeFileSync(p, content);
    console.log('Updated ' + file);
}
