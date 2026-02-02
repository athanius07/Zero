# Auto-update scaffold (no scraping yet)
# Implement your own fetchers, then merge into data/equipment.json.

import json
from pathlib import Path

DATA = Path('data/equipment.json')
rows = json.loads(DATA.read_text(encoding='utf-8'))

# TODO: fetch from your sources and merge into `rows`
# Example no-op: stable sort keeps diffs clean
rows = sorted(rows, key=lambda r: (r.get('OEM',''), r.get('Machine Name','')))

DATA.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding='utf-8')
print('Updated data/equipment.json (sorted). Add your fetching logic in scripts/update_data.py')
