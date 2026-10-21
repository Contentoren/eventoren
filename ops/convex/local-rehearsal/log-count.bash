#!/usr/bin/env bash
set -euo pipefail

# A zero-match log is healthy. Unlike grep -c, this filter exits successfully
# for zero matches; the caller's pipefail still preserves a failed log reader.
awk '
  BEGIN { mentions = 0 }
  tolower($0) ~ /cron|schedul/ { mentions++ }
  END { printf "%d\n", mentions }
'
