import re

with open("frontend/src/app/components/PublicPageShellClient.tsx", "r") as f:
    content = f.read()

# Add import
content = content.replace('import Link from "next/link";', 'import Link from "next/link";\nimport { BrandLogo } from "@/app/components/BrandLogo";')

# Replace logo
old_logo = '''        <Link href="/" className="nav-logo">
          <span className="nav-logo-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden={true}>
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </span>
          <span className="nav-logo-text">AIGenius</span>
        </Link>'''
new_logo = '        <BrandLogo size="default" />'

content = content.replace(old_logo, new_logo)

with open("frontend/src/app/components/PublicPageShellClient.tsx", "w") as f:
    f.write(content)
