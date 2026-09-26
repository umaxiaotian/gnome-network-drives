#!/usr/bin/env python3
"""Extract gettext templates and compile standard PO catalogs with Babel."""
from pathlib import Path
import argparse
import re

try:
    from babel.messages.catalog import Catalog
    from babel.messages.extract import extract_from_file
    from babel.messages.mofile import write_mo
    from babel.messages.pofile import read_po, write_po
except ImportError:
    raise SystemExit('Translation builds require python3-babel (Ubuntu package).')

ROOT = Path(__file__).resolve().parent.parent
DOMAIN = 'network-drives'


def template():
    catalog = Catalog(project=DOMAIN, version='1', copyright_holder='umaxiaotian')
    sources = [ROOT / 'extension.js', ROOT / 'prefs.js', *sorted((ROOT / 'src').glob('*.js'))]
    for source in sources:
        for lineno, message, comments, context in extract_from_file('javascript', source, keywords={'_': None}):
            catalog.add(message, locations=[(str(source.relative_to(ROOT)), lineno)], auto_comments=comments, context=context)
    return catalog


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--update-template', action='store_true')
    args = parser.parse_args()
    source = template()
    if args.update_template:
        with (ROOT / 'po' / f'{DOMAIN}.pot').open('wb') as out:
            write_po(out, source, sort_output=True)
    for path in sorted((ROOT / 'po').glob('*.po')):
        with path.open('rb') as stream:
            catalog = read_po(stream, locale=path.stem, domain=DOMAIN, abort_invalid=True)
        errors = list(catalog.check())
        if errors:
            raise SystemExit(f'{path}: invalid translations: {errors}')
        translated = 0
        for message in source:
            if not message.id:
                continue
            translation = catalog.get(message.id)
            if not translation or not translation.string or translation.fuzzy:
                if path.stem == 'ja':
                    raise SystemExit(f'{path}: missing Japanese translation: {message.id}')
                continue
            # Runtime strings currently use only a single %s placeholder.
            if re.findall(r'%s', message.id) != re.findall(r'%s', translation.string):
                raise SystemExit(f'{path}: placeholder mismatch: {message.id}')
            translated += 1
        destination = ROOT / 'locale' / path.stem / 'LC_MESSAGES' / f'{DOMAIN}.mo'
        destination.parent.mkdir(parents=True, exist_ok=True)
        with destination.open('wb') as stream:
            write_mo(stream, catalog)
        print(f'{path.stem}: compiled {translated} translated messages')


if __name__ == '__main__':
    main()
