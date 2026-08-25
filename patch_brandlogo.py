import re

with open("frontend/src/app/components/BrandLogo.tsx", "r") as f:
    content = f.read()

# Add solidText prop
content = content.replace("  asStatic?: boolean;\n}", "  asStatic?: boolean;\n  solidText?: boolean;\n}")
content = content.replace("}: BrandLogoProps) {", ", solidText = false }: BrandLogoProps) {")

# Update text classes
old_span = '''      <span
        className={cn(
          s.text,
          "font-bold tracking-tight text-transparent bg-clip-text bg-gradient-primary",
        )}
      >'''
new_span = '''      <span
        className={cn(
          s.text,
          "font-bold tracking-tight",
          solidText ? "text-inherit" : "text-transparent bg-clip-text bg-gradient-primary",
        )}
      >'''
content = content.replace(old_span, new_span)

with open("frontend/src/app/components/BrandLogo.tsx", "w") as f:
    f.write(content)
