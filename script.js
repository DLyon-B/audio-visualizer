/* === ELEMENT SELECTION === */
const audio = document.getElementById("audioPlayer");
const fileInput = document.getElementById("audioFile");
const volumeSlider = document.getElementById("volumeSlider");
const progressBar = document.getElementById("progressBar");
const bufferBar = document.getElementById("bufferBar");
const currentTimeText = document.getElementById("currentTime");
const durationTimeText = document.getElementById("durationTime");
const ampLabel = document.getElementById("ampValue");
const freqLabel = document.getElementById("freqValue");

/* === WEB AUDIO API SETUP === */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const source = audioCtx.createMediaElementSource(audio);

// Analyzer for visualization
const analyser = audioCtx.createAnalyser();
analyser.fftSize = 256;

// Gain Node for volume
const gainNode = audioCtx.createGain();

// Bass boost filter
const bass = audioCtx.createBiquadFilter();
bass.type = "lowshelf";
bass.frequency.value = 200;
bass.gain.value = 0;

// Connect audio graph
source.connect(bass);
bass.connect(gainNode);
gainNode.connect(analyser);
analyser.connect(audioCtx.destination);

/* === AUDIO PLAYER CONTROLS === */
document.getElementById("playBtn").onclick = () => {
    audioCtx.resume();
    audio.play();
};

document.getElementById("pauseBtn").onclick = () => audio.pause();

document.getElementById("stopBtn").onclick = () => {
    audio.pause();
    audio.currentTime = 0;
};

/* === VOLUME CONTROL === */
volumeSlider.oninput = () => gainNode.gain.value = volumeSlider.value;

/* === FILE PICKER === */
fileInput.onchange = () => {
    audio.src = URL.createObjectURL(fileInput.files[0]);
    audioCtx.resume();
    audio.play();
};

/* === BUFFER BAR UPDATE === */
audio.onprogress = () => {
    if (audio.buffered.length > 0) {
        bufferBar.style.width = (audio.buffered.end(0) / audio.duration) * 100 + "%";
    }
};

/* === PROGRESS BAR & TIME UPDATE === */
audio.addEventListener("loadedmetadata", () => {
    progressBar.max = Math.floor(audio.duration);
    durationTimeText.textContent = format(audio.duration);
});

audio.addEventListener("timeupdate", () => {
    progressBar.value = audio.currentTime;
    currentTimeText.textContent = format(audio.currentTime);
    updateProgressColor();
});

progressBar.oninput = () => audio.currentTime = progressBar.value;

/* === PROGRESS BAR COLOR LOGIC === */
function updateProgressColor() {
    if (!audio.duration) return;
    const p = (audio.currentTime / audio.duration) * 100;
    progressBar.style.background = `
        linear-gradient(to right, #4C8DFF ${p}%, #3D3D3D ${p}%)
    `;
}

/* === TIME FORMATTER === */
function format(sec) {
    return `${Math.floor(sec / 60)}:${("0" + Math.floor(sec % 60)).slice(-2)}`;
}

/* === VISUALIZER MODE (BARS / WAVEFORM) === */
let mode = "bars";

document.getElementById("barModeBtn").onclick = () =>
    setMode("bars", "barModeBtn");

document.getElementById("waveModeBtn").onclick = () =>
    setMode("wave", "waveModeBtn");

function setMode(newMode, id) {
    mode = newMode;
    document.querySelectorAll(".mode-btn").forEach(btn => btn.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}

/* === VISUALIZER CANVAS === */
const canvas = document.getElementById("visualizer");
const ctx = canvas.getContext("2d");

function render() {
    requestAnimationFrame(render);

    const len = analyser.frequencyBinCount;
    const data = new Uint8Array(len);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (mode === "bars") {
        analyser.getByteFrequencyData(data);
        const barW = canvas.width / len;
        let x = 0;

        for (let i = 0; i < len; i++) {
            ctx.fillStyle = "#4C8DFF";
            ctx.fillRect(x, canvas.height - data[i], barW - 2, data[i]);
            x += barW;
        }
    } else {
        analyser.getByteTimeDomainData(data);
        ctx.beginPath();
        ctx.strokeStyle = "#4C8DFF";

        let x = 0;
        const sliceWidth = canvas.width / len;

        for (let i = 0; i < len; i++) {
            let y = (data[i] / 128) * canvas.height / 2;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            x += sliceWidth;
        }
        ctx.stroke();
    }

    updateAudioInfo();
}
render();

/* === AUDIO EDUCATION LABELS (AMPLITUDE + FREQUENCY) === */
function updateAudioInfo() {
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);

    const avg = data.reduce((a, b) => a + b) / data.length;
    ampLabel.textContent = ((avg / 255) * 100).toFixed(1);

    const maxIndex = data.indexOf(Math.max(...data));
    const freq = maxIndex * (audioCtx.sampleRate / analyser.fftSize);
    freqLabel.textContent = Math.floor(freq);
}

/* === EFFECTS (FADE IN / OUT / BASS BOOST) === */
document.getElementById("fadeInBtn").onclick = () => {
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 3);
    toggleEffect("fadeInBtn");
};

document.getElementById("fadeOutBtn").onclick = () => {
    gainNode.gain.setValueAtTime(gainNode.gain.value, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 3);
    toggleEffect("fadeOutBtn");
};

let bassOn = false;
document.getElementById("bassBoostBtn").onclick = () => {
    bassOn = !bassOn;
    bass.gain.value = bassOn ? 15 : 0;
    document.getElementById("bassBoostBtn").classList.toggle("active");
};

/* === BUTTON ACTIVE EFFECT CONTROLLER === */
function toggleEffect(id) {
    const btn = document.getElementById(id);
    btn.classList.add("active");
    setTimeout(() => btn.classList.remove("active"), 3000);
}
