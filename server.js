// file: server.js

const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const youtubeHandler = require('./modules/youtube-handler');
const { processTikTokUrl } = require('./modules/tiktok-handler');
const { processInstagramUrl } = require('./modules/instagram-handler'); // --- 1. IMPOR HANDLER BARU ---

const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.json());

app.post('/videoInfo', async (req, res) => {
    const { url } = req.body;
    try {
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            await youtubeHandler.getInfo(req, res);
        } else if (url.includes('tiktok.com')) {
            const result = await processTikTokUrl(url);
            res.json({
                success: true, platform: 'tiktok', title: result.title, thumbnail: result.thumbnail,
                downloadInfo: { quality: 'Tanpa Watermark' }
            });
        // --- 2. TAMBAHKAN KONDISI UNTUK INSTAGRAM ---
        } else if (url.includes('instagram.com/reel/')) {
            const result = await processInstagramUrl(url);
            res.json({
                success: true, platform: 'instagram', title: result.title, thumbnail: result.thumbnail,
                downloadInfo: { quality: 'Kualitas Terbaik' }
            });
        } else {
            res.status(400).json({ success: false, message: 'URL tidak didukung. Harap masukkan URL YouTube, TikTok, atau Instagram Reel.' });
        }
    } catch (error) {
        console.error("Error di /videoInfo:", error.message);
        res.status(500).json({ success: false, message: 'Gagal memproses URL. Pastikan URL valid dan postingan bersifat publik.' });
    }
});

// Rute YouTube (tidak berubah)
app.get('/download', (req, res) => youtubeHandler.downloadVideo(req, res));
app.get('/download-audio', (req, res) => youtubeHandler.downloadAudio(req, res));

app.get('/download-tiktok-final', (req, res) => {
    const { url, title } = req.query;
    const safeTitle = (title || 'tiktok-video').replace(/[^a-zA-Z0-9 \-_]/g, '').trim() + '.mp4';
    
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }
    const uniqueFilename = `${Date.now()}.mp4`;
    const tempFilePath = path.join(tempDir, uniqueFilename);
    const ytdlpPath = path.join(__dirname, 'yt-dlp.exe');

    // Perintahkan yt-dlp untuk MENGUNDUH video ke file sementara
    const command = `"${ytdlpPath}" -o "${tempFilePath}" "${url}"`;

    console.log(`Menjalankan perintah: ${command}`);

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error saat yt-dlp mengunduh: ${stderr}`);
            return res.status(500).send('Gagal mengunduh video dari TikTok.');
        }

        console.log(`Video berhasil diunduh ke: ${tempFilePath}`);
        
        // Setelah unduhan selesai, kirim file tersebut ke pengguna
        res.download(tempFilePath, safeTitle, (err) => {
            if (err) {
                console.error('Error saat mengirim file ke pengguna:', err);
            }
            // HAPUS file sementara setelah dikirim (atau jika terjadi error)
            fs.unlink(tempFilePath, (unlinkErr) => {
                if (unlinkErr) {
                    console.error(`Gagal menghapus file sementara: ${tempFilePath}`, unlinkErr);
                } else {
                    console.log(`File sementara dihapus: ${tempFilePath}`);
                }
            });
        });
    });
});

app.get('/download-tiktok-audio', (req, res) => {
    const { url, title } = req.query;
    // Nama file yang disarankan untuk pengguna akan berakhiran .mp3
    const safeTitle = (title || 'tiktok-audio').replace(/[^a-zA-Z0-9 \-_]/g, '').trim() + '.mp3';
    
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }
    // File sementara juga kita beri ekstensi .mp3
    const uniqueFilename = `${Date.now()}.mp3`;
    const tempFilePath = path.join(tempDir, uniqueFilename);
    const ytdlpPath = path.join(__dirname, 'yt-dlp.exe');

    // --- PERINTAH YT-DLP YANG BERBEDA ---
    // -x atau --extract-audio: Memberitahu yt-dlp untuk mengambil audio saja.
    // --audio-format mp3: Menentukan format output audio.
    const command = `"${ytdlpPath}" -x --audio-format mp3 -o "${tempFilePath}" "${url}"`;

    console.log(`Menjalankan perintah audio: ${command}`);

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error saat yt-dlp mengekstrak audio: ${stderr}`);
            return res.status(500).send('Gagal mengekstrak audio dari video TikTok.');
        }

        console.log(`Audio berhasil diekstrak ke: ${tempFilePath}`);
        
        // Kirim file audio MP3 yang sudah jadi ke pengguna
        res.download(tempFilePath, safeTitle, (err) => {
            if (err) {
                console.error('Error saat mengirim file audio ke pengguna:', err);
            }
            // Hapus file sementara setelah dikirim
            fs.unlink(tempFilePath, (unlinkErr) => {
                if (unlinkErr) {
                    console.error(`Gagal menghapus file audio sementara: ${tempFilePath}`, unlinkErr);
                } else {
                    console.log(`File audio sementara dihapus: ${tempFilePath}`);
                }
            });
        });
    });
});


// --- 3. TAMBAHKAN RUTE UNDUHAN BARU UNTUK INSTAGRAM ---

// Rute untuk download video Instagram
app.get('/download-instagram-video', (req, res) => {
    const { url, title } = req.query;
    const safeTitle = (title || 'instagram-reel').replace(/[^a-zA-Z0-9 \-_]/g, '').trim() + '.mp4';
    
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    const uniqueFilename = `${Date.now()}.mp4`;
    const tempFilePath = path.join(tempDir, uniqueFilename);
    const ytdlpPath = path.join(__dirname, 'yt-dlp.exe');

    const command = `"${ytdlpPath}" -o "${tempFilePath}" "${url}"`;
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error saat yt-dlp mengunduh Instagram: ${stderr}`);
            return res.status(500).send('Gagal mengunduh video dari Instagram.');
        }
        res.download(tempFilePath, safeTitle, (err) => {
            if (err) console.error('Error saat mengirim file:', err);
            fs.unlink(tempFilePath, (unlinkErr) => {
                if (unlinkErr) {
                    console.error(`Gagal menghapus file IG sementara: ${tempFilePath}`, unlinkErr);
                } else {
                    console.log(`File IG sementara dihapus: ${tempFilePath}`);
                }
            });
        });
    });
});

// Rute untuk download audio Instagram
app.get('/download-instagram-audio', (req, res) => {
    const { url, title } = req.query;
    const safeTitle = (title || 'instagram-audio').replace(/[^a-zA-Z0-9 \-_]/g, '').trim() + '.mp3';
    
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    const uniqueFilename = `${Date.now()}.mp3`;
    const tempFilePath = path.join(tempDir, uniqueFilename);
    const ytdlpPath = path.join(__dirname, 'yt-dlp.exe');

    const command = `"${ytdlpPath}" -x --audio-format mp3 -o "${tempFilePath}" "${url}"`;
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error saat yt-dlp mengekstrak audio Instagram: ${stderr}`);
            return res.status(500).send('Gagal mengekstrak audio dari video Instagram.');
        }
        res.download(tempFilePath, safeTitle, (err) => {
            if (err) console.error('Error saat mengirim file audio:', err);
            fs.unlink(tempFilePath, (unlinkErr) => {
                if (unlinkErr) {
                    console.error(`Gagal menghapus file audio IG sementara: ${tempFilePath}`, unlinkErr);
                } else {
                    console.log(`File audio IG sementara dihapus: ${tempFilePath}`);
                }
            });
        });
    });
});


app.listen(PORT, () => console.log(`Server All-in-One Final berjalan di http://localhost:${PORT}`));