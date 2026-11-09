"""Reproducibly import CoFID 2021 macros (no spreadsheet library required).
Download the official workbook URL in docs/PLATFORM-FA.md, then pass its local path.
Trace values are represented as zero; missing/non-numeric macros cause row exclusion.
"""
import hashlib, json, re, sys, zipfile
from pathlib import Path
import xml.etree.ElementTree as E
source = Path(sys.argv[1])
expected = '436e9445ef2adb2a75f3d7edd51302de3adad25385f9795fc94ba58bd030e97d'
assert hashlib.sha256(source.read_bytes()).hexdigest() == expected, 'Workbook changed: review before importing'
ns = {'x': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(source) as z:
    ss = [''.join(e.itertext()) for e in E.fromstring(z.read('xl/sharedStrings.xml'))]
    foods = []
    for row in E.fromstring(z.read('xl/worksheets/sheet4.xml')).findall('.//x:row', ns)[3:]:
        cells = {re.sub(r'\d', '', c.attrib['r']): ss[int(c.find('x:v', ns).text)] if c.attrib.get('t') == 's' else c.findtext('x:v', '', ns) for c in row}
        def number(key):
            value = cells.get(key, '')
            return 0 if value == 'Tr' else float(value)
        try:
            food = dict(name=cells['B'], kcal100g=number('M'), protein100g=number('J'), carbs100g=number('L'), fat100g=number('K'), source='CoFID 2021: ' + cells['A'])
            if any(food[k] < 0 for k in ('kcal100g', 'protein100g', 'carbs100g', 'fat100g')): continue
            foods.append(food)
        except (KeyError, ValueError): continue
Path('platform/Api/Catalog/foods.json').write_text(json.dumps(foods, ensure_ascii=False, separators=(',', ':')) + '\n')
print(f'{len(foods)} foods imported; trace=0, unknown rows excluded')
