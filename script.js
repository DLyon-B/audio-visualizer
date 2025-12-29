/* =====================================================
   ELEMENT REFERENCES
===================================================== */
const audio = document.getElementById("audioPlayer");
const fileInput = document.getElementById("audioFile");
const volumeSlider = document.getElementById("volumeSlider");
const progressBar = document.getElementById("progressBar");
const bufferBar = document.getElementById("bufferBar");
const currentTimeText = document.getElementById("currentTime");
const durationTimeText = document.getElementById("durationTime");

const ampLabel = document.getElementById("ampValue");
const freqLabel = document.getElementById("freqValue");
const ampAvgLabel = document.getElementById("ampAvg");
const ampMaxLabel = document.getElementById("ampMax");
const ampMinLabel = document.getElementById("ampMin");
const freqZoneLabel = document.getElementById("freqZone");

const learnText = document.getElementById("learnText");
const dynamicExplain = document.getElementById("dynamicExplain");
const compareResult = document.getElementById("compareResult");
const analyzeText = document.getElementById("analyzeText");

/* Buttons */
const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stopBtn = document.getElementById("stopBtn");
const barModeBtn = document.getElementById("barModeBtn");
const waveModeBtn = document.getElementById("waveModeBtn");
const ampLearnBtn = document.getElementById("ampLearnBtn");
const freqLearnBtn = document.getElementById("freqLearnBtn");
const normalLearnBtn = document.getElementById("normalLearnBtn");
const saveStateBtn = document.getElementById("saveStateBtn");
const compareBtn = document.getElementById("compareBtn");
const analyzeBtn = document.getElementById("analyzeBtn");
const fadeInBtn = document.getElementById("fadeInBtn");
const fadeOutBtn = document.getElementById("fadeOutBtn");
const bassBoostBtn = document.getElementById("bassBoostBtn");

/* =====================================================
   AUDIO CONTEXT & NODES
===================================================== */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const source = audioCtx.createMediaElementSource(audio);

const analyser = audioCtx.createAnalyser();
analyser.fftSize = 256;

const gainNode = audioCtx.createGain();
let baseVolume = 1;

const bass = audioCtx.createBiquadFilter();
bass.type = "lowshelf";
bass.frequency.value = 250;
bass.gain.value = 0;

/* Audio Graph */
source.connect(bass);
bass.connect(gainNode);
gainNode.connect(analyser);
analyser.connect(audioCtx.destination);

/* =====================================================
   HELPER
===================================================== */
function ensureAudioContext() {
    if (audioCtx.state !== "running") audioCtx.resume();
}

function formatTime(sec) {
    return `${Math.floor(sec / 60)}:${("0" + Math.floor(sec % 60)).slice(-2)}`;
}

/* =====================================================
   PLAYER CONTROLS
===================================================== */
playBtn.onclick = () => {
    ensureAudioContext();
    audio.play();
};

pauseBtn.onclick = () => audio.pause();

stopBtn.onclick = () => {
    audio.pause();
    audio.currentTime = 0;
};

/* =====================================================
   VOLUME
===================================================== */
volumeSlider.oninput = () => {
    baseVolume = parseFloat(volumeSlider.value);
    gainNode.gain.setValueAtTime(baseVolume, audioCtx.currentTime);
};

/* =====================================================
   FILE PICKER
===================================================== */
fileInput.onchange = () => {
    ensureAudioContext();
    audio.src = URL.createObjectURL(fileInput.files[0]);
    audio.play();
};

/* =====================================================
   BUFFER & PROGRESS BAR
===================================================== */
audio.onprogress = () => {
    if (audio.buffered.length && audio.duration) {
        bufferBar.style.width =
            (audio.buffered.end(0) / audio.duration) * 100 + "%";
    }
};

audio.addEventListener("loadedmetadata", () => {
    progressBar.max = audio.duration;
    durationTimeText.textContent = formatTime(audio.duration);
});

audio.addEventListener("timeupdate", () => {
    if (!audio.duration) return;

    progressBar.value = audio.currentTime;
    currentTimeText.textContent = formatTime(audio.currentTime);

    const percent = (audio.currentTime / audio.duration) * 100;
    progressBar.style.background =
        `linear-gradient(to right,
            #4C8DFF 0%,
            #4C8DFF ${percent}%,
            #3D3D3D ${percent}%,
            #3D3D3D 100%)`;
});

progressBar.oninput = () => {
    audio.currentTime = progressBar.value;
};

/* =====================================================
   AUDIO EFFECTS (FINAL)
===================================================== */
fadeInBtn.onclick = () => {
    ensureAudioContext();
    fadeInBtn.classList.add("active");

    gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(
        baseVolume,
        audioCtx.currentTime + 3
    );

    setTimeout(() => fadeInBtn.classList.remove("active"), 3000);
};

fadeOutBtn.onclick = () => {
    ensureAudioContext();
    fadeOutBtn.classList.add("active");

    gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
    gainNode.gain.setValueAtTime(
        gainNode.gain.value,
        audioCtx.currentTime
    );
    gainNode.gain.linearRampToValueAtTime(
        0,
        audioCtx.currentTime + 3
    );

    setTimeout(() => fadeOutBtn.classList.remove("active"), 3000);
};

let bassOn = false;
bassBoostBtn.onclick = () => {
    bassOn = !bassOn;
    bass.gain.setValueAtTime(bassOn ? 18 : 0, audioCtx.currentTime);
    bassBoostBtn.classList.toggle("active");
};

/* =====================================================
   VISUALIZER MODE
===================================================== */
let vizMode = "bars";
barModeBtn.onclick = () => setVizMode("bars", barModeBtn);
waveModeBtn.onclick = () => setVizMode("wave", waveModeBtn);

function setVizMode(mode, btn) {
    vizMode = mode;
    document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
}

/* =====================================================
   LEARNING MODE
===================================================== */
let learnMode = null;

ampLearnBtn.onclick = () => setLearnMode("amp");
freqLearnBtn.onclick = () => setLearnMode("freq");
normalLearnBtn.onclick = () => setLearnMode(null);

function setLearnMode(mode) {
    learnMode = mode;
    document.querySelectorAll(".learn-btn").forEach(b => b.classList.remove("active"));

    if (mode === "amp") {
        ampLearnBtn.classList.add("active");
        learnText.textContent = "Mode Belajar Amplitude aktif.";
    } else if (mode === "freq") {
        freqLearnBtn.classList.add("active");
        learnText.textContent = "Mode Belajar Frequency aktif.";
    } else {
        normalLearnBtn.classList.add("active");
        learnText.textContent = "Mode Normal aktif.";
    }
}

/* =====================================================
   PAUSE & ANALYZE MODE (FINAL)
===================================================== */
let analyzeMode = false;
let frozenFrame = null;

const canvas = document.getElementById("visualizer");
const ctx = canvas.getContext("2d");

analyzeBtn.onclick = () => {
    analyzeMode = !analyzeMode;

    if (analyzeMode) {
        audio.pause();
        frozenFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        analyzeBtn.classList.add("active");
        document.body.classList.add("analyze-active");
        analyzeText.textContent =
            "Mode analisis aktif. Visualisasi dibekukan.";
    } else {
        frozenFrame = null;
        analyzeBtn.classList.remove("active");
        document.body.classList.remove("analyze-active");
        audio.play();
        analyzeText.textContent =
            "Mode analisis dimatikan.";
    }
};

/* =====================================================
   VISUALIZER RENDER
===================================================== */
let ampHistory = [];
let savedState = null;

function render() {
    requestAnimationFrame(render);

    if (analyzeMode && frozenFrame) {
        ctx.putImageData(frozenFrame, 0, 0);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const color =
        learnMode === "amp" ? "#00FF88" :
        learnMode === "freq" ? "#FFD84D" :
        "#4C8DFF";

    if (vizMode === "bars") {
        const freqData = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(freqData);

        const barW = canvas.width / freqData.length;
        let x = 0;
        freqData.forEach(v => {
            ctx.fillStyle = color;
            ctx.fillRect(x, canvas.height - v, barW - 2, v);
            x += barW;
        });
    } else {
        const timeData = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(timeData);

        ctx.beginPath();
        ctx.strokeStyle = color;

        let x = 0;
        const slice = canvas.width / timeData.length;
        timeData.forEach((v, i) => {
            const y = (v / 128) * canvas.height / 2;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            x += slice;
        });
        ctx.stroke();
    }

    updateAudioInfo();
}
render();

/* =====================================================
   AUDIO ANALYSIS (FINAL)
===================================================== */
function updateAudioInfo() {
    const timeData = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(timeData);

    let sum = 0;
    for (let i = 0; i < timeData.length; i++) {
        const v = (timeData[i] - 128) / 128;
        sum += v * v;
    }

    const rms = Math.sqrt(sum / timeData.length);
    const amplitude = Math.min(100, rms * 300);

    ampLabel.textContent = amplitude.toFixed(1);

    ampHistory.push(amplitude);
    if (ampHistory.length > 120) ampHistory.shift();

    ampAvgLabel.textContent =
        (ampHistory.reduce((a, b) => a + b, 0) / ampHistory.length).toFixed(1);
    ampMaxLabel.textContent = Math.max(...ampHistory).toFixed(1);
    ampMinLabel.textContent = Math.min(...ampHistory).toFixed(1);

    const freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqData);

    let maxVal = 0, maxIndex = 0;
    freqData.forEach((v, i) => {
        if (v > maxVal) {
            maxVal = v;
            maxIndex = i;
        }
    });

    if (maxVal < 5) {
        freqLabel.textContent = "0";
        freqZoneLabel.textContent = "-";
        return;
    }

    const dominantFreq =
        maxIndex * (audioCtx.sampleRate / analyser.fftSize);

    freqLabel.textContent = Math.floor(dominantFreq);

    if (dominantFreq < 300) freqZoneLabel.textContent = "Bass";
    else if (dominantFreq < 2000) freqZoneLabel.textContent = "Mid";
    else freqZoneLabel.textContent = "Treble";

    if (learnMode === "amp") {
        dynamicExplain.innerHTML =
            `<strong>Amplitude</strong><br>
             Menunjukkan keras–pelan suara.<br>
             Nilai saat ini: <strong>${amplitude.toFixed(1)}%</strong>`;
    } else if (learnMode === "freq") {
        dynamicExplain.innerHTML =
            `<strong>Frekuensi</strong><br>
             Menentukan tinggi nada.<br>
             Frekuensi dominan: <strong>${Math.floor(dominantFreq)} Hz</strong>`;
    }
}

/* =====================================================
   COMPARE MODE
===================================================== */
saveStateBtn.onclick = () => {
    if (ampHistory.length < 10) {
        compareResult.textContent =
            "Putar audio beberapa detik sebelum menyimpan.";
        return;
    }

    savedState = {
        amp: parseFloat(ampLabel.textContent),
        freq: parseFloat(freqLabel.textContent)
    };

    compareResult.textContent = "Kondisi A disimpan.";
};

compareBtn.onclick = () => {
    if (!savedState) {
        compareResult.textContent =
            "Simpan kondisi A terlebih dahulu.";
        return;
    }

    const currAmp = parseFloat(ampLabel.textContent);
    const currFreq = parseFloat(freqLabel.textContent);

    compareResult.innerHTML =
        `Δ Amplitude: ${(currAmp - savedState.amp).toFixed(1)}%<br>
         Δ Frekuensi: ${(currFreq - savedState.freq).toFixed(1)} Hz`;
};
