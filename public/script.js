// file: public/script.js

// Ambil elemen UI sekali saja untuk efisiensi
const getVideoBtn = document.getElementById('get-video-btn');
const urlInput = document.getElementById('video-url'); // Mengganti ID dari youtube-url
const videoInfoDiv = document.getElementById('video-info');
const loader = document.getElementById('loader');
const errorMessageDiv = document.getElementById('error-message');
const downloadLinksDiv = document.getElementById('download-links');
const thumbnailImg = document.getElementById('thumbnail');
const videoTitleH3 = document.getElementById('video-title');

getVideoBtn.addEventListener('click', async () => {
    const originalUrl = urlInput.value.trim();
    if (!originalUrl) {
        showError('URL tidak boleh kosong.');
        return;
    }

    // Reset UI dan siapkan untuk loading
    videoInfoDiv.style.display = 'none';
    errorMessageDiv.style.display = 'none';
    downloadLinksDiv.innerHTML = '';
    loader.style.display = 'block';
    getVideoBtn.disabled = true;
    urlInput.disabled = true;

    try {
        const response = await fetch('/videoInfo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: originalUrl }),
        });

        const data = await response.json();
        
        if (data.success) {
            thumbnailImg.src = data.thumbnail;
            videoTitleH3.textContent = data.title;

            // Panggil fungsi display yang sesuai
            if (data.platform === 'youtube') {
                displayYoutubeLinks(data, originalUrl);
            } else if (data.platform === 'tiktok') {
                displayPlatformLinks('TikTok', originalUrl, data.title, '/download-tiktok-final', '/download-tiktok-audio');
            } else if (data.platform === 'instagram') {
                displayPlatformLinks('Reel Instagram', originalUrl, data.title, '/download-instagram-video', '/download-instagram-audio');
            }

            videoInfoDiv.style.display = 'flex'; // Gunakan flex agar konsisten dengan CSS
        } else {
            showError(data.message);
        }
    } catch (error) {
        showError('Terjadi kesalahan jaringan. Silakan coba lagi.');
        console.error('Fetch error:', error);
    } finally {
        // Kembalikan UI ke keadaan normal setelah selesai
        loader.style.display = 'none';
        getVideoBtn.disabled = false;
        urlInput.disabled = false;
    }
});

function showError(message) {
    errorMessageDiv.textContent = message;
    errorMessageDiv.style.display = 'block';
}

function createDownloadLink(text, href, isAudio = false) {
    const link = document.createElement('a');
    link.href = href;
    link.className = 'download-link';
    if (isAudio) link.classList.add('audio');
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    
    const icon = document.createElement('i');
    icon.className = isAudio ? 'fas fa-music' : 'fas fa-video';
    
    link.appendChild(icon);
    link.append(text); // Menggunakan append untuk menambahkan teks setelah ikon
    return link;
}

// Fungsi umum untuk TikTok dan Instagram untuk mengurangi duplikasi kode
function displayPlatformLinks(platformName, originalUrl, title, videoRoute, audioRoute) {
    downloadLinksDiv.innerHTML = `<h4>Download ${platformName}:</h4>`;
    
    const videoHref = `${videoRoute}?url=${encodeURIComponent(originalUrl)}&title=${encodeURIComponent(title)}`;
    const videoLink = createDownloadLink('Video (MP4)', videoHref);
    downloadLinksDiv.appendChild(videoLink);
    
    const audioHref = `${audioRoute}?url=${encodeURIComponent(originalUrl)}&title=${encodeURIComponent(title)}`;
    const audioLink = createDownloadLink('Audio Saja (MP3)', audioHref, true);
    downloadLinksDiv.appendChild(audioLink);
}

function displayYoutubeLinks(data, originalUrl) {
    downloadLinksDiv.innerHTML = '<h4>Download Video (MP4):</h4>';
    const uniqueQualities = new Map();
    data.videoFormats.forEach(format => {
        if (!uniqueQualities.has(format.qualityLabel)) uniqueQualities.set(format.qualityLabel, format);
    });

    uniqueQualities.forEach(format => {
        const href = `/download?url=${encodeURIComponent(originalUrl)}&videoItag=${format.itag}&audioItag=${data.bestAudioItag}&title=${encodeURIComponent(data.title)}`;
        const link = createDownloadLink(`${format.qualityLabel}`, href);
        downloadLinksDiv.appendChild(link);
    });

    if (data.audioFormats && data.audioFormats.length > 0) {
        const h4 = document.createElement('h4');
        h4.textContent = 'Download Audio Saja (MP3):';
        h4.style.marginTop = '1rem';
        downloadLinksDiv.appendChild(h4);
        
        data.audioFormats.forEach(format => {
            const href = `/download-audio?url=${encodeURIComponent(originalUrl)}&itag=${format.itag}&title=${encodeURIComponent(data.title)}`;
            const bitrate = Math.round(format.audioBitrate) + 'kbps';
            const link = createDownloadLink(`Kualitas Asli ${bitrate}`, href, true);
            downloadLinksDiv.appendChild(link);
        });
    }
}