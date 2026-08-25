import json
import os

transcript_path = "/Users/clinton/.gemini/antigravity-ide/brain/1ebe3a15-6b6e-4b7f-bd59-832160eca469/.system_generated/logs/transcript_full.jsonl"
target_files = [
    "frontend/src/app/components/auth/AuthPage.tsx",
    "frontend/src/app/(views)/desktop-login/page.tsx",
    "frontend/src/app/(views)/desktop-welcome/page.tsx",
    "frontend/src/app/(views)/desktop-success/page.tsx",
    "frontend/src/app/(views)/error/page.tsx",
    "frontend/src/app/(views)/(auth)/loading.tsx",
    "frontend/src/app/(views)/desktop-login/loading.tsx"
]

latest_writes = {}

with open(transcript_path, 'r') as f:
    for line in f:
        try:
            step = json.loads(line)
            if step.get('type') == 'PLANNER_RESPONSE' and 'tool_calls' in step:
                for call in step['tool_calls']:
                    if call['name'] in ['write_to_file']:
                        args = call['args']
                        target_file = args.get('TargetFile', '')
                        for t in target_files:
                            if t in target_file:
                                latest_writes[t] = args.get('CodeContent', '')
        except Exception as e:
            pass

for t in target_files:
    if t in latest_writes:
        content = latest_writes[t]
        if content.startswith('"') and content.endswith('"'):
            content = json.loads(content) # unescape json string
        with open(t, 'w') as out:
            out.write(content)
        print(f"Restored {t}")
    else:
        print(f"Could not find write_to_file for {t}")
