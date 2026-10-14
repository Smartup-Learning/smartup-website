#!/bin/sh
# Subset Rubik to Latin plus the punctuation and arrows the site uses (–, —, ’, •, ·, →, ₹).
# Source: the full WOFF2 files supplied with v1 in dist/assets/. Requires fonttools (pip install fonttools brotli).
set -e
for w in 400 500 600 700; do
  pyftsubset "dist/assets/rubik-$w.woff2" --output-file="public/fonts/rubik-$w.woff2" --flavor=woff2 \
    --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+20B9,U+2122,U+2190-2199,U+2212" \
    --layout-features='*'
done
ls -l public/fonts/*.woff2
