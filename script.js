/* === ELEMENT REFERENCE === */
const audio = document.getElementById("audioPlayer");
const fileInput = document.getElementById("audioFile");
const volumeSlider = document.getElementById("volumeSlider");
const progressBar = document.getElementById("progressBar");
const bufferBar = document.getElementById("bufferBar");
const currentTimeText = document.getElementById("currentTime");
const durationTimeText = document.getElementById("durationTime");
const ampLabel = document.getElementById("ampValue");
const freqLabel = document.getElementById("freqValue");
const learnText = document.getElementById("learnText");

/* === AUDIO CONTEXT & NODES === */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const source = audioCtx.createMediaElementSource(audio);

const analyser = audioCtx.createAnalyser();
analyser.fftSize = 256;

const gainNode = audioCtx.createGain();

const bass = audioCtx.createBiquadFilter();
bass.type = "lowshelf";
bass.frequency.value = 200;
bass.gain.value = 0;

/* CONNECT AUDIO GRAPH */
source.connect(bass);
bass.connect(gainNode);
gainNode.connect(analyser);
analyser.connect(audioCtx.destination);

/* === AUDIO CONTROLS === */
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

/* === BUFFER BAR === */
audio.onprogress = () => {
    if (audio.buffered.length > 0) {
        bufferBar.style.width = (audio.buffered.end(0) / audio.duration) * 100 + "%";
    }
};

/* === PROGRESS BAR LOGIC === */
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

function updateProgressColor() {
    if (!audio.duration) return;
    const p = (audio.currentTime / audio.duration) * 100;

    progressBar.style.background =
        `linear-gradient(to right, #4C8DFF ${p}%, #3D3D3D ${p}%)`;
}

function format(sec) {
    return `${Math.floor(sec / 60)}:${("0" + Math.floor(sec % 60)).slice(-2)}`;
}

/* === VISUALIZER MODES === */
let mode = "bars";

document.getElementById("barModeBtn").onclick = () => setMode("bars", "barModeBtn");
document.getElementById("waveModeBtn").onclick = () => setMode("wave", "waveModeBtn");

function setMode(m, id) {
    mode = m;
    document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}

/* === CANVAS VISUALIZER === */
const canvas = document.getElementById("visualizer");
const ctx = canvas.getContext("2d");

let learnMode = null; // null | "amp" | "freq"

function render() {
    requestAnimationFrame(render);

    const len = analyser.frequencyBinCount;
    const data = new Uint8Array(len);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    /* === VISUALIZER COLOR BASED ON LEARNING MODE === */
    let color =
        learnMode === "amp"  ? "#00FF88" :     // GREEN
        learnMode === "freq" ? "#FFD84D" :     // YELLOW
                               "#4C8DFF";      // DEFAULT BLUE

    if (mode === "bars") {
        analyser.getByteFrequencyData(data);
        const barW = canvas.width / len;
        let x = 0;

        for (let i = 0; i < len; i++) {
            ctx.fillStyle = color;
            ctx.fillRect(x, canvas.height - data[i], barW - 2, data[i]);
            x += barW;
        }
    } else {
        analyser.getByteTimeDomainData(data);
        ctx.beginPath();
        ctx.strokeStyle = color;

        let x = 0;
        const sliceWidth = canvas.width / len;

        for (let i = 0; i < len; i++) {
            const y = (data[i] / 128) * canvas.height / 2;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            x += sliceWidth;
        }
        ctx.stroke();
    }

    updateAudioInfo();
}
render();

/* === REALTIME AUDIO INFO === */
function updateAudioInfo() {
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);

    const avg = data.reduce((a, b) => a + b) / data.length;
    ampLabel.textContent = ((avg / 255) * 100).toFixed(1);

    const index = data.indexOf(Math.max(...data));
    const freq = index * (audioCtx.sampleRate / analyser.fftSize);
    freqLabel.textContent = Math.floor(freq);
}

/* === EFFECT BUTTONS === */
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

function toggleEffect(id) {
    const btn = document.getElementById(id);
    btn.classList.add("active");
    setTimeout(() => btn.classList.remove("active"), 3000);
}

/* === LEARNING MODE === */
document.getElementById("ampLearnBtn").onclick = () => setLearn("amp");
document.getElementById("freqLearnBtn").onclick = () => setLearn("freq");

function setLearn(type) {
    learnMode = type;

    document.querySelectorAll(".learn-btn").forEach(btn =>
        btn.classList.remove("active")
    );

    document.getElementById(
        type === "amp" ? "ampLearnBtn" : "freqLearnBtn"
    ).classList.add("active");

    learnText.innerHTML =
        type === "amp"
            ? "Amplitude adalah besar energi gelombang suara. Semakin tinggi puncak gelombang, semakin keras bunyi terdengar."
            : "Frequency adalah jumlah getaran per detik. Semakin rapat gelombang, semakin tinggi nada yang dihasilkan.";
}
