export class AudioSystem {
  constructor() {
    this.context = null;
    this.master = null;
    this.noiseBuffer = null;
    this.volume = 0.7;
    this.enabled = true;
  }

  init() {
    if (this.context) {
      if (this.context.state === "suspended") this.context.resume();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      this.enabled = false;
      return;
    }
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = this.volume;
    const compressor = this.context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.24;
    this.master.connect(compressor);
    compressor.connect(this.context.destination);
    this.noiseBuffer = this.makeNoise(2);
  }

  makeNoise(seconds) {
    const length = Math.floor(this.context.sampleRate * seconds);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  setVolume(value) {
    this.volume = value;
    if (this.master) this.master.gain.setTargetAtTime(value, this.context.currentTime, 0.03);
  }

  now() {
    return this.context ? this.context.currentTime : 0;
  }

  noise(duration, gain, filterType, frequency, endFrequency, delay = 0) {
    if (!this.context || !this.enabled) return;
    const start = this.now() + delay;
    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.context.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(frequency, start);
    if (endFrequency) filter.frequency.exponentialRampToValueAtTime(Math.max(40, endFrequency), start + duration);
    filter.Q.value = filterType === "bandpass" ? 1.2 : 0.7;
    const envelope = this.context.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.006);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.master);
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  tone(frequency, endFrequency, duration, gain, type = "sine", delay = 0) {
    if (!this.context || !this.enabled) return;
    const start = this.now() + delay;
    const oscillator = this.context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
    const envelope = this.context.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  shoot() {
    this.noise(0.16, 0.24, "highpass", 1500, 520);
    this.noise(0.07, 0.12, "bandpass", 420, 260);
    this.tone(110, 48, 0.14, 0.15, "triangle");
    this.tone(820, 240, 0.035, 0.045, "square");
  }

  empty() {
    this.noise(0.035, 0.08, "highpass", 2400, 1800);
    this.tone(1400, 900, 0.03, 0.035, "square");
  }

  hit(headshot) {
    this.tone(headshot ? 1750 : 1200, headshot ? 2100 : 1300, 0.09, 0.05, "sine");
    this.noise(0.05, 0.05, "bandpass", 2600, 1400);
  }

  kill() {
    this.tone(520, 160, 0.24, 0.07, "sawtooth");
    this.noise(0.28, 0.15, "lowpass", 900, 200);
  }

  enemyShoot() {
    this.tone(260, 90, 0.2, 0.06, "sawtooth");
    this.noise(0.12, 0.045, "bandpass", 700, 300);
  }

  explosion() {
    this.noise(0.7, 0.34, "lowpass", 1200, 90);
    this.tone(78, 28, 0.62, 0.28, "sine");
    this.noise(0.2, 0.11, "highpass", 1800, 500);
  }

  playerHit() {
    this.tone(96, 42, 0.3, 0.22, "sine");
    this.noise(0.18, 0.12, "lowpass", 700, 140);
  }

  reload() {
    this.noise(0.04, 0.08, "highpass", 2100, 1500);
    this.tone(240, 170, 0.05, 0.04, "square", 0.02);
    this.noise(0.05, 0.09, "bandpass", 900, 500, 1.15);
    this.tone(320, 460, 0.07, 0.045, "square", 1.24);
    this.noise(0.04, 0.1, "highpass", 2600, 2000, 1.5);
  }

  wave() {
    this.tone(220, 220, 0.3, 0.06, "sawtooth");
    this.tone(330, 330, 0.45, 0.05, "sawtooth", 0.16);
    this.noise(0.5, 0.07, "bandpass", 1200, 300, 0.1);
  }

  shieldHit() {
    this.tone(860, 420, 0.16, 0.04, "triangle");
    this.noise(0.08, 0.04, "highpass", 3000, 1800);
  }

  step() {
    this.noise(0.05, 0.035, "lowpass", 320, 120);
  }

  click() {
    this.tone(620, 420, 0.04, 0.03, "square");
  }
}
