const fs = require('fs');

function resolveOurs(file) {
    const content = fs.readFileSync(file, 'utf8');
    const resolved = content.replace(/<<<<<<< HEAD\n([\s\S]*?)=======\n[\s\S]*?>>>>>>> origin\/main\n/g, '$1');
    fs.writeFileSync(file, resolved);
}

['frontend/src/app/(views)/docs/privacy-policy/page.tsx', 
 'frontend/src/app/components/PublicPageShellClient.tsx', 
 'frontend/src/app/components/auth/AuthPage.tsx', 
 'frontend/src/app/components/landing/SiteFooter.tsx'].forEach(resolveOurs);

