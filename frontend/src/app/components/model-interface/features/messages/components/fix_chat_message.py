import os

file_path = r'c:\Users\DELL5530\Desktop\projects\aigenius\frontend\src\app\components\model-interface\features\messages\components\ChatMessage.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Remove duplicate imagePreview prop in ChatMessageProps
# It's at lines 70 and 71 (1-indexed)
if 'imagePreview: string | null;' in lines[69] and 'imagePreview: string | null;' in lines[70]:
    print("Fixing duplicate imagePreview prop...")
    del lines[70]

# 2. Remove duplicate handleMenuOrphanReply
# First one is at 218-220, second one is at 281-283
# We'll search for the second one after line 250
found_count = 0
new_lines = []
for i, line in enumerate(lines):
    if 'const handleMenuOrphanReply = useCallback(() => {' in line:
        found_count += 1
        if found_count > 1:
            print(f"Removing duplicate handleMenuOrphanReply at line {i+1}")
            # Skip this line and the next two
            # We assume it's exactly 3 lines + potential empty line
            continue 
    if found_count > 1 and found_count <= 1: # This logic is a bit flawed, let's refine
        pass
    new_lines.append(line)

# Let's do a cleaner second pass for the function
final_lines = []
skip_until = -1
found_func = 0
for i, line in enumerate(lines):
    if i < skip_until:
        continue
    if 'const handleMenuOrphanReply = useCallback(() => {' in line:
        found_func += 1
        if found_func == 2:
            print(f"Skipping second handleMenuOrphanReply at line {i+1}")
            skip_until = i + 4 # skip the 3 lines of the func + 1 possible newline
            continue
    final_lines.append(line)

# 3. Fix broken JSX at lines 582-587
# Target:
# 582:                                 />
# 583:                                     streaming={streaming}
# ...
# 587:                                 />

output_lines = []
for i, line in enumerate(final_lines):
    if 'streaming={streaming}' in line and 'onOpenChange={setMessageActionsMenuOpen}' in final_lines[i-2]:
        print(f"Fixing broken JSX at line {i+1}")
        # Replace the broken line and the following ones until the next />
        output_lines.append('                                <CostDisplay\n')
        output_lines.append('                                    variant="costOnly"\n')
        output_lines.append('                                    msg={msg}\n')
        continue
    if i > 0 and 'streaming={streaming}' in final_lines[i-1] and 'onOpenChange={setMessageActionsMenuOpen}' in final_lines[i-3]:
        # We are in the middle of the broken block, skip until we find />
        if '/>' in line:
            # This is the end of the broken block, we've already started the replacement
            # but we need to finish it. 
            # Wait, let's just use a more robust replacement.
            pass
        continue
    output_lines.append(line)

# Actually, let's just do a string replacement for the whole block to be safe.
content = "".join(final_lines)

# Fix duplicate imagePreview (again, just in case)
content = content.replace(
    '    imagePreview: string | null;\n    imagePreview: string | null;',
    '    imagePreview: string | null;'
)

# Fix broken JSX
broken_jsx = """                                />
                                    streaming={streaming}
                                    showCosts={showCosts}
                                    cost={cost}
                                    formatCost={formatCost}
                                />"""
fixed_jsx = """                                />
                                <CostDisplay
                                    variant="costOnly"
                                    msg={msg}
                                    streaming={streaming}
                                    showCosts={showCosts}
                                    cost={cost}
                                    formatCost={formatCost}
                                />"""

if broken_jsx in content:
    print("Found broken JSX, fixing...")
    content = content.replace(broken_jsx, fixed_jsx)
else:
    # Try with different line endings
    broken_jsx_rn = broken_jsx.replace('\\n', '\\r\\n')
    fixed_jsx_rn = fixed_jsx.replace('\\n', '\\r\\n')
    if broken_jsx_rn in content:
        print("Found broken JSX (CRLF), fixing...")
        content = content.replace(broken_jsx_rn, fixed_jsx_rn)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done.")
