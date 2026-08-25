import json

with open("/Users/clinton/.gemini/antigravity-cli/brain/3718e5e3-4810-40e5-98e0-578b355374c7/.system_generated/logs/transcript_full.jsonl") as f:
    for line in f:
        data = json.loads(line)
        if data.get("type") == "GENERIC" and "PublicPageShell.tsx" in data.get("content", ""):
            if "ThemeInitializer" in data.get("content", ""):
                print(data["content"])
                break
