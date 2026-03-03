from pathlib import Path
text = Path('vital-lead-clinic_backend/src/models/Automation.js').read_text()
lines = text.splitlines()
for idx, line in enumerate(lines, 1):
    if 'static async getActiveAutomations' in line:
        print(idx)
        break
