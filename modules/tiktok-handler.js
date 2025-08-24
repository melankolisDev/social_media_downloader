// file: modules/tiktok-handler.js

const { exec } = require('child_process');
const path = require('path');

async function processTikTokUrl(url) {
    const ytdlpPath = './yt-dlp';
    let command = `"${ytdlpPath}" --print-json --no-warnings "${url}"`;
    // Periksa apakah variabel PROXY_URL ada
    if (process.env.PROXY_URL) {
        // Jika ada, tambahkan flag --proxy
        command = `"${ytdlpPath}" --proxy "${process.env.PROXY_URL}" --socket-timeout 20 --print-json --no-warnings "${url}"`;
    }

    return new Promise((resolve, reject) => {
        exec(command, { timeout: 60000 }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error saat menjalankan yt-dlp: ${stderr}`);
                return reject(new Error('Gagal memproses URL TikTok.'));
            }

            try {
                const data = JSON.parse(stdout);
                const downloadUrl = data.url;
                
                // --- PERUBAHAN DI SINI ---
                // Ambil juga http_headers dari output yt-dlp
                const httpHeaders = data.http_headers;

                if (!downloadUrl || !httpHeaders) {
                    return reject(new Error('Gagal menemukan URL atau headers unduhan di dalam data JSON.'));
                }
                
                resolve({
                    title: data.title || 'Video TikTok',
                    thumbnail: data.thumbnail || '',
                    downloadUrl: downloadUrl,
                    // Tambahkan headers ke objek yang kita kembalikan
                    httpHeaders: httpHeaders,
                    platform: 'tiktok'
                });

            } catch (parseError) {
                console.error('Gagal mem-parsing JSON dari yt-dlp:', parseError);
                reject(new Error('Terjadi kesalahan saat memproses data video.'));
            }
        });
    });
}

module.exports = { processTikTokUrl };