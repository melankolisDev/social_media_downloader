// file: modules/youtube-handler.js

const ytdl = require('@distube/ytdl-core');
const { spawn } = require('child_process');
const { pipeline } = require('stream');

const ytdlOptions = {
    requestOptions: {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        },
    },
};

// Fungsi untuk mendapatkan informasi video YouTube
async function getInfo(req, res) {
    try {
        const { url } = req.body;
        const info = await ytdl.getInfo(url, ytdlOptions);
        
        const videoFormats = info.formats.filter(f => f.container === 'mp4' && f.hasVideo).sort((a, b) => b.height - a.height);
        const bestAudio = info.formats.filter(f => f.mimeType.includes('audio/mp4')).sort((a, b) => b.audioBitrate - a.audioBitrate)[0];
        let uniqueAudios = [...new Map(info.formats.filter(f => f.audioBitrate && !f.hasVideo).map(f => [f.audioBitrate, f])).values()].sort((a, b) => b.audioBitrate - a.audioBitrate);
        
        uniqueAudios = uniqueAudios.filter(format => format.audioBitrate >= 64);

        res.json({ 
            success: true,
            platform: 'youtube', // Kita tambahkan info platform
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url,
            videoFormats,
            bestAudioItag: bestAudio ? bestAudio.itag : null,
            audioFormats: uniqueAudios,
        });
    } catch (error) {
        console.error("Error di YouTube Handler (getInfo):", error.message);
        res.status(500).json({ success: false, message: 'Gagal mendapatkan info video YouTube.' });
    }
}

// Fungsi untuk mengunduh video YouTube (Video+Audio)
function downloadVideo(req, res) {
    try {
        const { url, videoItag, audioItag, title } = req.query;
        const safeTitle = (title || 'youtube-audio').replace(/[^a-zA-Z0-9 \-_]/g, '').trim() || 'youtube-audio';
        res.header('Content-Disposition', `attachment; filename="${safeTitle}.mp4"`);

        const video = ytdl(url, { ...ytdlOptions, quality: videoItag });
        const audio = ytdl(url, { ...ytdlOptions, quality: audioItag });
        
        const ffmpegProcess = spawn('ffmpeg', ['-i', 'pipe:3', '-i', 'pipe:4', '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-movflags', 'frag_keyframe+empty_moov', '-f', 'mp4', 'pipe:1'], { stdio: ['ignore', 'pipe', 'pipe', 'pipe', 'pipe'] });
        
        pipeline(video, ffmpegProcess.stdio[3], (err) => { if (err) console.error('YT Pipeline video gagal:', err.message); });
        pipeline(audio, ffmpegProcess.stdio[4], (err) => { if (err) console.error('YT Pipeline audio gagal:', err.message); });
        pipeline(ffmpegProcess.stdio[1], res, (err) => { if (err) console.error('YT Pipeline utama ke klien gagal:', err.message); });

    } catch (error) {
        console.error("Error di YouTube Handler (downloadVideo):", error.message);
        res.status(500).send("Gagal memulai download video YouTube.");
    }
}

// Fungsi untuk mengunduh audio saja dari YouTube
function downloadAudio(req, res) {
     try {
        const { url, itag, title } = req.query;
        const safeTitle = (title || 'audio').replace(/[<>:"/\\|?*]+/g, '');
        res.header('Content-Disposition', `attachment; filename="${safeTitle}.mp3"`);
        const audio = ytdl(url, { ...ytdlOptions, quality: itag });
        const ffmpegProcess = spawn('ffmpeg', ['-i', 'pipe:3', '-c:a', 'libmp3lame', '-b:a', '128k', '-ar', '44100', '-f', 'mp3', 'pipe:1'], { stdio: ['ignore', 'pipe', 'pipe', 'pipe', 'pipe'] });
        pipeline(audio, ffmpegProcess.stdio[3], (err) => { if (err) console.error('YT Pipeline audio-only gagal:', err.message); });
        pipeline(ffmpegProcess.stdio[1], res, (err) => { if (err) console.error('YT Pipeline audio-only ke klien gagal:', err.message); });
    } catch (error) {
        console.error("Error di YouTube Handler (downloadAudio):", error.message);
        res.status(500).send("Gagal memulai download audio YouTube.");
    }
}


// Ekspor semua fungsi agar bisa digunakan di server.js
module.exports = {
    getInfo,
    downloadVideo,
    downloadAudio
};