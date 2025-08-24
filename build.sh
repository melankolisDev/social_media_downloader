#!/usr/bin/env bash
# exit on error
set -o errexit

# --- TAMBAHKAN BLOK INI UNTUK MENGINSTAL PYTHON ---
echo "Updating package lists and installing Python..."
apt-get update && apt-get install -y python3 python3-pip

echo "Installing NPM dependencies..."
npm install

echo "Downloading yt-dlp and ffmpeg..."
# Unduh yt-dlp versi terbaru untuk Linux (bukan .exe lagi)
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o yt-dlp
chmod +x yt-dlp

# Unduh ffmpeg untuk Linux
curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -o ffmpeg.tar.xz
tar -xf ffmpeg.tar.xz
# Cari folder hasil ekstraksi (namanya dinamis)
FFMPEG_DIR=$(find . -type d -name "ffmpeg-*-amd64-static")
mv "$FFMPEG_DIR/ffmpeg" .
# Bersihkan file yang tidak perlu
rm -rf ffmpeg.tar.xz "$FFMPEG_DIR"

echo "Build finished successfully!"