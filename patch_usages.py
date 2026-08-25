with open("frontend/src/app/components/HomePage.tsx", "r") as f:
    content = f.read()
content = content.replace('<BrandLogo size="default" />', '<BrandLogo size="default" solidText className="nav-logo" />')
with open("frontend/src/app/components/HomePage.tsx", "w") as f:
    f.write(content)

with open("frontend/src/app/components/PublicPageShellClient.tsx", "r") as f:
    content = f.read()
content = content.replace('<BrandLogo size="default" />', '<BrandLogo size="default" solidText className="nav-logo" />')
with open("frontend/src/app/components/PublicPageShellClient.tsx", "w") as f:
    f.write(content)
