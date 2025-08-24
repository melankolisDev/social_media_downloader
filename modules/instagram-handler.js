// file: modules/instagram-handler.js

const { exec } = require('child_process');
const path = require('path');

async function processInstagramUrl(url) { // NAMA FUNGSI DIUBAH
    const ytdlpPath = './yt-dlp';
    // Perintah yt-dlp tidak perlu diubah, ia cerdas mengenali URL
    let command = `"${ytdlpPath}" --print-json --no-warnings "${url}"`;
    // Periksa apakah variabel PROXY_URL ada
    if (process.env.PROXY_URL) {
        // Jika ada, tambahkan flag --proxy
        command = `"${ytdlpPath}" --proxy "${process.env.PROXY_URL}" --socket-timeout 20 --print-json --no-warnings "${url}"`;
    }

    return new Promise((resolve, reject) => {
        exec(command, { timeout: 60000 }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error saat menjalankan yt-dlp untuk Instagram: ${stderr}`);
                // Ubah pesan error agar lebih spesifik
                return reject(new Error('Gagal memproses URL Instagram. Pastikan URL valid dan postingan bersifat publik.'));
            }

            try {
                const data = JSON.parse(stdout);
                
                resolve({
                    title: data.title || 'Instagram Reel',
                    thumbnail: data.thumbnail || '',
                    // Kita tidak butuh downloadUrl atau headers di sini lagi
                    platform: 'instagram' // PLATFORM DIUBAH
                });

            } catch (parseError) {
                console.error('Gagal mem-parsing JSON dari yt-dlp (Instagram):', parseError);
                reject(new Error('Terjadi kesalahan saat memproses data video.'));
            }
        });
    });
}

const processInstagramUrl = (url) => processUrl(url, 'Instagram');

// Ekspor fungsi baru
module.exports = { processInstagramUrl };