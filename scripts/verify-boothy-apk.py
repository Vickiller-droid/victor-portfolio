"""Verify actual packaged UI bytes, not merely source test results."""
from pathlib import Path
import hashlib, json, zipfile
apk = Path('android/app/build/outputs/apk/debug/app-debug.apk')
with zipfile.ZipFile(apk) as z:
    files = []
    for src in sorted(Path('public/boothy').glob('*')):
        if src.is_file() and src.suffix in {'.js', '.css'} and src.name != 'sw.js':
            assert z.read('assets/boothy/' + src.name) == src.read_bytes(), f'Packaged file differs: {src}'
            files.append(src.name)
    html = z.read('assets/boothy/index.html').decode()
    assert 'android-bootstrap.js' in html
    assert 'reliability-3' in html
    app = z.read('assets/boothy/app.js').decode()
    assert "button('popupCheck', 'Check my things'" not in app
    assert 'buildVersion' in app
report = {'apk': apk.name, 'sha256': hashlib.sha256(apk.read_bytes()).hexdigest(), 'verified_assets': files}
Path('android/app/build/outputs/apk/debug/verification.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report))
