# Translating Network Drives

The extension uses standard GNU gettext catalogs under the `network-drives` domain. English source text is the fallback; `ja.po` supplies Japanese, `ko.po` Korean and `zh_CN.po` Simplified Chinese. Translation follows the desktop locale, without changing stored drive definitions.

Build dependencies: Python 3 and Babel (`python3-babel` on Ubuntu). These are not runtime dependencies.

1. Run `python3 scripts/translations.py --update-template` from the repository root after changing UI text.
2. Copy `po/network-drives.pot` to `po/<language>.po`, or update an existing catalog with a gettext-compatible editor (such as Poedit). Set the `Language`, `Plural-Forms`, translator and revision headers. Remove the header's `fuzzy` marker once reviewed.
3. Translate each `msgstr`. Keep `%s` placeholders exactly; they represent user-supplied drive names. Entire sentences are translated so word order can change. Leave protocol names (SMB, SFTP, WebDAV) and identifiers unchanged.
4. Run `python3 scripts/translations.py` to validate and compile catalogs. Japanese must cover every extracted message; other incomplete catalogs fall back to English for missing/fuzzy entries.
5. Run `./scripts/test.sh` and test the UI with the target locale. Japanese GTK and isolated Shell test commands are in README.
6. Commit `.po` and `.pot` sources. Generated `locale/` files are ignored and rebuilt by `scripts/package.sh`.

For example, add `de.po` for German, `fr.po` for French, or `pt_BR.po` for Brazilian Portuguese. Use standard gettext locale identifiers, not display names.

The `src/i18n.js` wrapper uses a domain-specific lookup. GNOME's ExtensionBase initializes that domain for Shell and preferences from metadata. Shared modules perform translation at call time, never at module import time, so initialization order and state comparisons remain independent of language.
