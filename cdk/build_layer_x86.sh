#!/bin/bash

# Build psycopg2 layer using Docker with Python 3.11 for x86_64 architecture
docker run --platform linux/amd64 --rm -v $(pwd):/workspace python:3.11-slim bash -c "
apt-get update && apt-get install -y zip && \
cd /workspace && \
rm -rf layers/temp && \
mkdir -p layers/temp/python/lib/python3.11/site-packages && \
pip install --target layers/temp/python/lib/python3.11/site-packages psycopg2-binary && \
cd layers/temp && \
zip -r ../psycopg2-py311.zip python/ && \
cd .. && rm -rf temp
"

echo "psycopg2 layer built successfully for x86_64!"