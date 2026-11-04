"""Refuse distribution if the signer differs from the owner's retained certificate."""
import os, re, sys
from pathlib import Path

def normalize(value):
    return value.replace(':', '').strip().lower()

def verify(text, expected):
    expected = normalize(expected)
    if not re.fullmatch(r'[0-9a-f]{64}', expected):
        raise ValueError('Configure a valid owner SHA-256 certificate fingerprint')
    found = re.findall(r'^Signer #\d+ certificate SHA-256 digest:\s*([0-9a-fA-F:]+)\s*$', text, re.M)
    if len(found) != 1 or normalize(found[0]) != expected:
        raise ValueError('APK signer does not match the retained owner certificate')

if __name__ == '__main__':
    verify(Path(sys.argv[1]).read_text(), os.environ.get('EXPECTED_CERT', ''))
    print('Owner signing certificate verified')
