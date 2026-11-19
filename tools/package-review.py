"""Package tracked .50 preview source; never publish or sign an Android app."""
from pathlib import Path
import hashlib
import json
import subprocess
import sys
import zipfile

root = Path(__file__).resolve().parents[1]
output = Path(sys.argv[1]).resolve()
paths = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')
files, omitted = [], []
for name in filter(None, paths):
    if name.startswith('downloads/') and 'V0.9.5.46.apk' not in name:
        omitted.append(name)
        continue
    files.append(name)
manifest = {'kind': 'REGULAR .50 WEB SOURCE CANDIDATE', 'version': '0.9.5.50',
            'sourceCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip(),
            'baseCommit': '82543c12cee842c869bced97b92c29e61b2d36a1',
            'nativeApkVersion': None, 'installersIncluded': False, 'newNativeApk': False, 'deployed': False,
            'omittedHistoricalInstallers': omitted, 'sha256': {}}
output.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
    for name in sorted(files):
        data = (root / name).read_bytes()
        manifest['sha256'][name] = hashlib.sha256(data).hexdigest()
        archive.writestr('LotKeys-0.9.5.50-REGULAR-WEB/' + name, data)
    archive.writestr('LotKeys-0.9.5.50-REGULAR-WEB/REVIEW-MANIFEST.json', json.dumps(manifest, indent=2))
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
print(json.dumps({'file': output.name, 'bytes': output.stat().st_size, 'sha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'files': len(files), 'newNativeApk': False, 'deployed': False}))
