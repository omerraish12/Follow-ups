from pathlib import Path
text = Path('vital-lead-clinic_frontend/src/pages/Automations.tsx').read_text()
lines = text.splitlines()
for idx, line in enumerate(lines, 1):
    if 'showcaseStats.map' in line:
        print(idx)
        break
