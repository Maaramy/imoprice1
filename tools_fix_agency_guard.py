from pathlib import Path

p = Path("src/pages/EstimationResult.tsx")
s = p.read_text(encoding="utf-8")

old = "{agencyResponses !== undefined && agencyResponses.length > 0 && ("
new = "{agencyResponses && agencyResponses.length > 0 && ("

if old not in s:
    raise SystemExit("PATTERN NOT FOUND")

s = s.replace(old, new, 1)
p.write_text(s, encoding="utf-8")
print("OK — guard fixed")
