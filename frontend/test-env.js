const fs = require('fs');
const content = fs.readFileSync('.env.local', 'utf8');
console.log(content.match(/NEXT_PUBLIC_NOBOX_API_ROOT_URL=(.*)/)[1]);
