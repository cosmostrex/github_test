let osc, fft, env;
let pianoKeys = [];
let whiteKeys = [0,2,4,5,7,9,11];
let blackMap = { 1:true,3:true,6:true,8:true,10:true };
let noteNames = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

let baseOctave = 4;
let startOctave = 3;
let numOctaves = 4;

let whiteW = 40;
let whiteH = 180;
let blackW = 24;
let blackH = 110;

let currentFreq = 0;
let currentNoteLabel = "";
let audioStarted = false;

const keyToSemitone = {
  'z':0,  's':1,  'x':2,  'd':3,  'c':4,
  'v':5,  'g':6,  'b':7,  'h':8,  'n':9,
  'j':10, 'm':11
};

function setup(){
  const totalWhites = 7 * numOctaves;
  const w = totalWhites * whiteW;
  let cnv = createCanvas(w, 300);
  cnv.mousePressed(startSound);

  osc = new p5.Oscillator('sine');
  osc.amp(0);
  env = new p5.Envelope();
  env.setADSR(0.005, 0.05, 0.6, 0.2);
  env.setRange(0.7, 0);
  fft = new p5.FFT();

  buildPiano();
  noLoop();
  loop();
}

function draw(){
  background(245);
  drawPiano();

  fill(25);
  noStroke();
  textSize(14);
  textAlign(LEFT, TOP);
  if (!audioStarted) {
    text('캔버스를 클릭해서 오디오를 시작하세요.', 10, 8);
  } else if (currentFreq > 0) {
    text(`${currentNoteLabel}  ${nf(currentFreq,1,2)} Hz`, 10, 8);
  } else {
    text(`대기 중 · 옥타브: ${baseOctave}  [ '[' ↓ / ']' ↑ ]`, 10, 8);
  }

  drawSpectrum();
}

// 오디오 관련. 맥북이라 사파리 기준으로 코드 작성했습니다

function startSound() {
  getAudioContext().resume();
  if (!audioStarted) {
    userStartAudio();
    osc.start();
    audioStarted = true;
  }
}

function triggerNote(noteIdx, octave){
  if (!audioStarted) return;
  const midi = (octave + 1) * 12 + noteIdx;
  const freq = midiToFreq(midi);
  currentFreq = freq;
  currentNoteLabel = noteNames[noteIdx] + octave;
  osc.freq(freq);
  env.play(osc);
}

function midiToFreq(m){
  return 440 * Math.pow(2, (m - 69) / 12);
}

// 피아노 모양

function buildPiano(){
  pianoKeys = [];
  let xCursor = 0;

  for (let o = 0; o < numOctaves; o++){
    const octave = startOctave + o;

    for (let wIdx = 0; wIdx < whiteKeys.length; wIdx++){
      const noteIdx = whiteKeys[wIdx];
      pianoKeys.push({
        x: xCursor + wIdx * whiteW,
        y: 100 - whiteH,
        w: whiteW,
        h: whiteH,
        noteIdx,
        octave,
        isBlack: false
      });
    }

    const blackPos = [
      { afterWhite: 0, noteIdx: 1 },
      { afterWhite: 1, noteIdx: 3 },
      { afterWhite: 3, noteIdx: 6 },
      { afterWhite: 4, noteIdx: 8 },
      { afterWhite: 5, noteIdx:10 }
    ];

    for (let b of blackPos){
      const wx = xCursor + b.afterWhite * whiteW;
      pianoKeys.push({
        x: wx + whiteW * 0.7,
        y: 100 - blackH,
        w: blackW,
        h: blackH,
        noteIdx: b.noteIdx,
        octave,
        isBlack: true
      });
    }

    xCursor += whiteW * whiteKeys.length;
  }
}

function drawPiano(){
  for (let k of pianoKeys){
    if (k.isBlack) continue;
    stroke(60);
    strokeWeight(1);
    fill(255);
    rect(k.x, k.y, k.w, k.h);

    if (k.noteIdx === 0){
      noStroke();
      fill(20);
      textSize(12);
      textAlign(CENTER, BOTTOM);
      text(`C${k.octave}`, k.x + k.w*0.5, k.y + k.h - 4);
    }
  }

  for (let k of pianoKeys){
    if (!k.isBlack) continue;
    noStroke();
    fill(20);
    rect(k.x, k.y, k.w, k.h, 3);
  }

  const hover = hitTest(mouseX, mouseY);
  if (hover){
    noStroke();
    fill(hover.isBlack ? color(70) : color(230, 230, 255));
    rect(hover.x, hover.y, hover.w, hover.h);
  }
}

// 입력

function mousePressed(){
  const key = hitTest(mouseX, mouseY, true);
  if (key){
    triggerNote(key.noteIdx, key.octave);
  }
}

function mouseDragged(){
  const key = hitTest(mouseX, mouseY, true);
  if (key){
    triggerNote(key.noteIdx, key.octave);
  }
}

function keyPressed(){
  if (key === '['){
    baseOctave = constrain(baseOctave - 1, 0, 8);
    return;
  }
  if (key === ']'){
    baseOctave = constrain(baseOctave + 1, 0, 8);
    return;
  }

  const k = key.toLowerCase();
  if (k in keyToSemitone){
    startSound();
    const semitone = keyToSemitone[k];
    triggerNote(semitone, baseOctave);
  }
}

// 터치

function touchStarted() {
  getAudioContext().resume();
}

// 유틸 

function hitTest(mx, my, blackFirst = false){
  if (blackFirst){
    for (let i = 0; i < pianoKeys.length; i++){
      const k = pianoKeys[i];
      if (!k.isBlack) continue;
      if (mx >= k.x && mx <= k.x + k.w && my >= k.y && my <= k.y + k.h){
        return k;
      }
    }
  }
  for (let i = 0; i < pianoKeys.length; i++){
    const k = pianoKeys[i];
    if (k.isBlack) continue;
    if (mx >= k.x && mx <= k.x + k.w && my >= k.y && my <= k.y + k.h){
      return k;
    }
  }
  if (!blackFirst){
    for (let i = 0; i < pianoKeys.length; i++){
      const k = pianoKeys[i];
      if (!k.isBlack) continue;
      if (mx >= k.x && mx <= k.x + k.w && my >= k.y && my <= k.y + k.h){
        return k;
      }
    }
  }
  return null;
}

function drawSpectrum(){
  if (!audioStarted) return;
  const spectrum = fft.analyze();
  let yBase = height - 6;
  noStroke();
  fill(255, 0, 255);
  const barW = width / spectrum.length;
  for (let i = 0; i < spectrum.length; i++){
    const h = -150 + map(spectrum[i], 0, 255, 150, 0);
    rect(i * barW, yBase, barW, h);
  }
}
