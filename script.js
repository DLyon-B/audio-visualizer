// ======= AUDIO SETUP =======
const audio = document.getElementById("audioPlayer");
const volumeSlider = document.getElementById("volumeSlider");

// Web Audio API
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const source = audioCtx.createMediaElementSource(audio);

const analyser = audioCtx.createAnalyser();
analyser.fftSize = 256;

const gainNode = audioCtx.createGain();
const filter = audioCtx.createBiquadFilter();

// Default filter (no bass boost)
filter.type = "lowshelf";
filter.frequency.value = 200;
filter.gain.value = 0;

// Connect nodes
source.connect(filter);
filter.connect(gainNode);
gainNode.connect(analyser);
analyser.connect(audioCtx.destination);


// ======= BUTTON CONTROLS =======
document.getElementById("playBtn").onclick = () => {
    audioCtx.resume(); 
    audio.play();
};

document.getElementById("pauseBtn").onclick = () => audio.pause();

document.getElementById("stopBtn").onclick = () => {
    audio.pause();
    audio.currentTime = 0;
};


// ======= VOLUME CONTROL =======
volumeSlider.addEventListener("input", function () {
    gainNode.gain.value = this.value;
});


// ======= VISUALIZER =======
const canvas = document.getElementById("visualizer");
const ctx = canvas.getContext("2d");

function drawBars() {
    requestAnimationFrame(drawBars);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    analyser.getByteFrequencyData(dataArray);

    ctx.fillStyle = "#1F1F1F";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength);

    let x = 0;
    dataArray.forEach(value => {
        const barHeight = value;
        ctx.fillStyle = "#4C8DFF";
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
        x += barWidth;
    });
}

drawBars();


// ======= EFFECTS =======
document.getElementById("fadeInBtn").onclick = () => {
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 3);
};

document.getElementById("fadeOutBtn").onclick = () => {
    gainNode.gain.setValueAtTime(gainNode.gain.value, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 3);
};

let bassBoostOn = false;

document.getElementById("bassBoostBtn").onclick = () => {
    bassBoostOn = !bassBoostOn;
    filter.gain.value = bassBoostOn ? 15 : 0;
};

// ===== FILE PICKER =====
const fileInput = document.getElementById("audioFile");

fileInput.addEventListener("change", function() {
    const files = this.files;

    if (files.length === 0) return;

    const fileURL = URL.createObjectURL(files[0]);
    audio.src = fileURL;

    audio.play();
    audioCtx.resume();
});

const progressBar = document.getElementById("progressBar");
const currentTimeText = document.getElementById("currentTime");
const durationTimeText = document.getElementById("durationTime");

audio.addEventListener("loadedmetadata", () => {
    progressBar.max = audio.duration;
    durationTimeText.textContent = formatTime(audio.duration);
});

audio.addEventListener("timeupdate", () => {
    progressBar.value = audio.currentTime;
    currentTimeText.textContent = formatTime(audio.currentTime);
});

function formatTime(sec) {
    const minutes = Math.floor(sec / 60);
    const seconds = Math.floor(sec % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

progressBar.addEventListener("input", () => {
    audio.currentTime = progressBar.value;
});
