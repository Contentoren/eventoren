#!/usr/bin/env python3
"""Sync the local-rehearsal SSR runtime AUTH_SECRET from a private secret file.

Reads the fresh secret from --secret-file (0600, owned, 64 lowercase hex)
and atomically replaces the single AUTH_SECRET= line in --runtime (0600,
owned, exactly one AUTH_SECRET line), keeping every other line unchanged.

With --check, validates both files and exits 0 without writing anything, so
callers can prevalidate the runtime file BEFORE rotating the backend secret.

Refuses symlinks, non-regular files, files not owned by the caller, files
readable by group/other, and private parent dirs that are missing, symlinked,
unowned, or group/other-accessible. All errors are constant sanitized
messages: no values and no file contents are ever printed.
"""

import argparse
import os
import re
import stat
import sys
import tempfile

SECRET_PATTERN = re.compile(r"^[0-9a-f]{64}$")
OP = "localRehearsalRuntimeAuthSync"


def fail(reason):
    sys.stderr.write("%s: error: refusing (%s)\n" % (OP, reason))
    raise SystemExit(1)


def guarded_read(path, label):
    if not os.path.isabs(path):
        fail("%s path is not absolute" % label)
    if os.path.islink(path):
        fail("%s path is a symlink" % label)
    try:
        st = os.stat(path)
    except OSError:
        fail("%s file is missing or unreadable" % label)
    if not stat.S_ISREG(st.st_mode):
        fail("%s file is not a regular file" % label)
    if st.st_uid != os.geteuid():
        fail("%s file is not owned by the caller" % label)
    if st.st_mode & 0o077:
        fail("%s file is readable by group or other" % label)
    parent = os.path.dirname(path)
    if os.path.islink(parent):
        fail("%s parent dir is a symlink" % label)
    try:
        pst = os.stat(parent)
    except OSError:
        fail("%s parent dir is missing or unreadable" % label)
    if not stat.S_ISDIR(pst.st_mode):
        fail("%s parent is not a directory" % label)
    if pst.st_uid != os.geteuid():
        fail("%s parent dir is not owned by the caller" % label)
    if pst.st_mode & 0o077:
        fail("%s parent dir is accessible by group or other" % label)
    try:
        with open(path, "rb") as handle:
            raw = handle.read()
    except OSError:
        fail("%s file is missing or unreadable" % label)
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        fail("%s file is not utf-8 text" % label)


def read_secret(secret_file):
    text = guarded_read(secret_file, "secret")
    candidate = text.strip()
    if not SECRET_PATTERN.match(candidate):
        fail("secret file does not hold exactly one 64-char lowercase hex secret")
    return candidate


def split_runtime(runtime_file):
    text = guarded_read(runtime_file, "runtime")
    lines = text.split("\n")
    if text.endswith("\n"):
        lines = lines[:-1]
        trailing_newline = True
    else:
        trailing_newline = len(lines) > 1
    indexes = [i for i, line in enumerate(lines) if line.startswith("AUTH_SECRET=")]
    if len(indexes) != 1:
        fail("runtime file does not hold exactly one AUTH_SECRET line")
    return lines, indexes[0], trailing_newline


def command_check(runtime_file, secret_file):
    split_runtime(runtime_file)
    read_secret(secret_file)
    sys.stdout.write("%s: check=ok (runtime writable in scope, secret usable)\n" % OP)
    return 0


def command_sync(runtime_file, secret_file):
    lines, index, trailing_newline = split_runtime(runtime_file)
    secret = read_secret(secret_file)
    lines[index] = "AUTH_SECRET=" + secret
    body = "\n".join(lines) + ("\n" if trailing_newline else "")
    target_dir = os.path.dirname(runtime_file)
    fd, tmp_name = None, None
    try:
        fd, tmp_name = tempfile.mkstemp(dir=target_dir, prefix=".runtime.env.", suffix=".tmp")
    except OSError:
        fail("runtime temp file cannot be created")
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as handle:
            fd = None
            handle.write(body)
        os.replace(tmp_name, runtime_file)
        tmp_name = None
    except OSError:
        fail("runtime file cannot be replaced atomically")
    finally:
        if fd is not None:
            try:
                os.close(fd)
            except OSError:
                pass
        if tmp_name is not None:
            try:
                os.unlink(tmp_name)
            except OSError:
                pass
    sys.stdout.write("%s: sync=ok (one AUTH_SECRET line replaced, rest unchanged)\n" % OP)
    return 0


def main(argv):
    parser = argparse.ArgumentParser(prog="localRehearsalRuntimeAuthSync.py")
    parser.add_argument("--runtime", required=True)
    parser.add_argument("--secret-file", required=True)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)
    if args.check:
        return command_check(args.runtime, args.secret_file)
    return command_sync(args.runtime, args.secret_file)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
