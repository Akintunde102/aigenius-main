import json

transcript_path = "/Users/clinton/.gemini/antigravity-ide/brain/1ebe3a15-6b6e-4b7f-bd59-832160eca469/.system_generated/logs/transcript_full.jsonl"
target_files = [
    "client/frontend/src/app/components/auth/AuthPage.tsx",
    "client/frontend/src/app/(views)/desktop-login/page.tsx",
    "client/frontend/src/app/(views)/desktop-welcome/page.tsx",
    "client/frontend/src/app/(views)/desktop-success/page.tsx",
    "client/frontend/src/app/(views)/error/page.tsx",
    "client/frontend/src/app/(views)/(auth)/loading.tsx",
    "client/frontend/src/app/(views)/desktop-login/loading.tsx"
]

def apply_chunk(content, chunk):
    start = chunk['StartLine'] - 1
    end = chunk['EndLine']
    target = chunk['TargetContent']
    replacement = chunk['ReplacementContent']
    
    lines = content.split('\n')
    
    # Try to find target in the specified range
    search_area = '\n'.join(lines[start:end])
    if target in search_area:
        new_area = search_area.replace(target, replacement)
        lines[start:end] = new_area.split('\n')
        return '\n'.join(lines)
    else:
        # Fallback to global search if line numbers shifted slightly
        if target in content:
            return content.replace(target, replacement)
        else:
            print(f"Warning: Target content not found in file")
            return content

# Read current files
file_contents = {}
for tf in target_files:
    try:
        with open(tf, 'r') as f:
            file_contents[tf] = f.read()
    except Exception:
        pass

edits_found = 0

with open(transcript_path, 'r') as f:
    for line in f:
        try:
            step = json.loads(line)
            if step.get('type') == 'PLANNER_RESPONSE' and 'tool_calls' in step:
                for call in step['tool_calls']:
                    name = call['name']
                    args = call.get('args', {})
                    target_file = args.get('TargetFile', '')
                    
                    if not any(t in target_file for t in target_files):
                        continue
                        
                    tf = next(t for t in target_files if t in target_file)
                    
                    if name == 'write_to_file':
                        code = args.get('CodeContent', '')
                        if code.startswith('"') and code.endswith('"'):
                            code = json.loads(code)
                        file_contents[tf] = code
                        edits_found += 1
                        
                    elif name == 'replace_file_content':
                        if tf in file_contents:
                            file_contents[tf] = apply_chunk(file_contents[tf], args)
                            edits_found += 1
                            
                    elif name == 'multi_replace_file_content':
                        if tf in file_contents:
                            chunks = args.get('ReplacementChunks', [])
                            if isinstance(chunks, str):
                                chunks = json.loads(chunks)
                            # Apply chunks in reverse order to avoid line number shifts
                            chunks.sort(key=lambda x: x.get('StartLine', 0), reverse=True)
                            for chunk in chunks:
                                file_contents[tf] = apply_chunk(file_contents[tf], chunk)
                            edits_found += 1
                            
        except Exception as e:
            pass

print(f"Applied {edits_found} edits.")

for tf, content in file_contents.items():
    with open(tf, 'w') as f:
        f.write(content)
    print(f"Saved {tf}")

