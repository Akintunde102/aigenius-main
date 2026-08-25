import re

def write_file(transcript_txt, target_path):
    with open(transcript_txt, "r") as f:
        lines = f.readlines()
    
    out_lines = []
    start = False
    for line in lines:
        if "The following code has been modified" in line:
            start = True
            continue
        if "The above content shows the entire" in line:
            break
        if start:
            # Match number: space
            m = re.match(r"^\d+: (.*)", line)
            if m:
                out_lines.append(m.group(1))
            else:
                out_lines.append(line)
    
    # Also strip newlines safely
    text = "".join(out_lines)
    text = text.replace("\n\n\nThe above content", "") # just in case
    with open(target_path, "w") as f:
        f.write(text)

write_file("recovered_client.txt", "frontend/src/app/components/PublicPageShellClient.tsx")
write_file("recovered_shell.txt", "frontend/src/app/components/PublicPageShell.tsx")
