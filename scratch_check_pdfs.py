from pathlib import Path
from app.parsers.scanner import ArchiveScanner, parse_filename_metadata

scanner = ArchiveScanner()
files = scanner.scan(Path('.'))
print(f"Total PDFs: {len(files['pdf_files'])}")
for p in files['pdf_files']:
    meta = parse_filename_metadata(p.name)
    print(f"{p.name} -> meetup: {meta.get('meetup_number')}, date: {meta.get('date_str')}")
