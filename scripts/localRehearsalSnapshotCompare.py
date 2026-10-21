#!/usr/bin/env python3
"""Additive-schema snapshot comparator for local rehearsal restores.

Compares an original snapshot zip against a backend re-export zip and passes
only when every snapshot-carried data table restores byte-identically
(same document IDs AND same full canonical record field hashes), while
permitting explicitly allowlisted DECLARED new tables to appear empty.

Rules (fail-closed):
- Every data table carried by the original snapshot must exist after restore.
- Carried tables: identical ID sets AND identical per-record canonical hashes.
  Optional new schema fields are never invented; the full original record body
  must match exactly.
- `_tables` metadata records are `{name, id}` mappings (not `_id` docs):
  every original name->id mapping must be preserved exactly (a renumbered id
  or a lost mapping fails).
- Extra `_tables` mappings and extra data tables are permitted ONLY when the
  table name is in the explicit `--allow-empty-extra` set AND the table holds
  zero documents. A nonempty extra table, an unknown extra table, or an
  allowlisted table carrying rows all fail.
- The allowlist itself is validated (strict table identifiers, no system or
  metadata names); callers must source it from declared schema provenance.

Logs table names, document counts, and match booleans only. Never rows,
field values, hashes, or tokens.
"""

import argparse
import hashlib
import json
import os
import re
import stat
import sys
import zipfile

TABLE_NAME_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
RESERVED_PREFIXES = ("_system", "_storage")
RESERVED_NAMES = {"_tables"}


def fail(message):
    print(f"error: {message}", file=sys.stderr)
    raise SystemExit(1)


def validate_allowlist(names):
    seen = []
    for name in names:
        if not TABLE_NAME_PATTERN.match(name):
            fail(f"allowlisted table name is not a plain table identifier: {name!r}")
        if name in RESERVED_NAMES or name.startswith(RESERVED_PREFIXES):
            fail(f"allowlisted table name is reserved and can never be an extra: {name!r}")
        if name in seen:
            fail(f"allowlisted table name is duplicated: {name!r}")
        seen.append(name)
    return seen


def check_private_file(label, path):
    if not os.path.isfile(path) or os.path.islink(path):
        fail(f"{label} must be a regular file, not a symlink: {path}")
    mode = stat.S_IMODE(os.stat(path).st_mode)
    if mode & 0o077:
        fail(f"{label} must not be readable by group or others (chmod 600): {path}")


def read_documents(path):
    """Return {table: {doc_id: canonical_hash}} plus the raw _tables mapping."""
    tables = {}
    meta = {}
    try:
        archive = zipfile.ZipFile(path)
    except Exception:
        fail(f"snapshot is not a readable zip file: {path}")
    with archive:
        for entry in archive.namelist():
            if not entry.endswith("/documents.jsonl"):
                continue
            table = entry.split("/")[0]
            if table in RESERVED_NAMES:
                continue
            if table.startswith(RESERVED_PREFIXES):
                fail(f"snapshot carries a reserved system/storage table: {table}")
            docs = tables.setdefault(table, {})
            with archive.open(entry) as handle:
                for lineno, raw in enumerate(handle, start=1):
                    line = raw.decode("utf-8").strip()
                    if not line:
                        continue
                    try:
                        record = json.loads(line)
                    except json.JSONDecodeError:
                        fail(f"{table} has a non-JSON record at line {lineno}")
                    if not isinstance(record, dict) or "_id" not in record:
                        fail(f"{table} has a record without an _id at line {lineno}")
                    doc_id = record["_id"]
                    if doc_id in docs:
                        fail(f"{table} carries a duplicated _id: {doc_id!r}")
                    canonical = json.dumps(
                        record, sort_keys=True, separators=(",", ":"), ensure_ascii=False
                    )
                    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
                    docs[doc_id] = digest
        try:
            with archive.open("_tables/documents.jsonl") as handle:
                for lineno, raw in enumerate(handle, start=1):
                    line = raw.decode("utf-8").strip()
                    if not line:
                        continue
                    try:
                        record = json.loads(line)
                    except json.JSONDecodeError:
                        fail(f"_tables has a non-JSON record at line {lineno}")
                    name, table_id = record.get("name"), record.get("id")
                    if not isinstance(name, str) or not isinstance(table_id, int):
                        fail(f"_tables has a malformed mapping at line {lineno}")
                    if name in meta:
                        fail(f"_tables carries a duplicated mapping: {name!r}")
                    meta[name] = table_id
        except KeyError:
            pass
    return tables, meta


def main(argv):
    parser = argparse.ArgumentParser(description="Compare snapshot against re-export.")
    parser.add_argument("--original", required=True)
    parser.add_argument("--reexport", required=True)
    parser.add_argument("--allow-empty-extra", action="append", default=[])
    args = parser.parse_args(argv)

    cli_allowed = []
    for chunk in args.allow_empty_extra:
        cli_allowed.extend(part.strip() for part in chunk.split(",") if part.strip())
    allowed = validate_allowlist(cli_allowed)

    check_private_file("original snapshot", args.original)
    check_private_file("backend re-export", args.reexport)

    snap_tables, snap_meta = read_documents(args.original)
    live_tables, live_meta = read_documents(args.reexport)

    ok = True

    # 1. Every snapshot-carried data table must exist after restore with
    #    identical IDs and identical full-record field hashes.
    for table in sorted(snap_tables):
        snap_docs = snap_tables[table]
        live_docs = live_tables.get(table)
        if live_docs is None:
            print(f"{table}: snapshot={len(snap_docs)} backend=missing ids=MISMATCH fields=MISMATCH")
            ok = False
            continue
        ids_match = set(snap_docs) == set(live_docs)
        fields_match = ids_match and all(snap_docs[doc_id] == live_docs[doc_id] for doc_id in snap_docs)
        print(
            f"{table}: snapshot={len(snap_docs)} backend={len(live_docs)} "
            f"ids={'match' if ids_match else 'MISMATCH'} "
            f"fields={'match' if fields_match else 'MISMATCH'}"
        )
        if not (ids_match and fields_match):
            ok = False

    # 2. Original _tables name->id mappings must be preserved exactly.
    for name in sorted(snap_meta):
        if live_meta.get(name) != snap_meta[name]:
            print(f"_tables:{name}: mapping=MISMATCH")
            ok = False
        else:
            print(f"_tables:{name}: mapping=match")

    # 3. Extra tables / extra mappings only when allowlisted AND empty.
    for table in sorted(set(live_tables) - set(snap_tables)):
        count = len(live_tables[table])
        permitted = table in allowed and count == 0
        print(
            f"{table}: snapshot=0 backend={count} "
            f"extra_allowed={'yes' if permitted else 'no'} empty={'yes' if count == 0 else 'no'}"
        )
        if not permitted:
            ok = False
    for name in sorted(set(live_meta) - set(snap_meta)):
        table_empty = len(live_tables.get(name, {})) == 0
        permitted = name in allowed and table_empty
        print(f"_tables:{name}: extra_allowed={'yes' if permitted else 'no'} empty={'yes' if table_empty else 'no'}")
        if not permitted:
            ok = False

    if not ok:
        fail("document counts, IDs, record fields, or table mappings differ after restore")
    total_docs = sum(len(docs) for docs in snap_tables.values())
    print(
        f"verify=ok tables={len(snap_tables)} docs={total_docs} "
        f"allowed_extra={','.join(allowed) if allowed else 'none'}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
