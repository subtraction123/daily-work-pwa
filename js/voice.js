/* ========== Voice Recording ========== */

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recognition = null;

// ---- Web Speech API: Speech-to-Text ----
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast('浏览器不支持语音识别，请使用 Chrome');
    return null;
  }
  
  const rec = new SpeechRecognition();
  rec.lang = 'zh-CN';
  rec.interimResults = true;
  rec.continuous = true;
  rec.maxAlternatives = 1;
  
  rec.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    
    // Update the appropriate textarea
    const homeTextarea = document.getElementById('inspTextInput');
    const fullTextarea = document.getElementById('fullInspTextInput');
    
    if (currentScreen === 'home' && currentInspTab === 'voice') {
      homeTextarea.value = transcript;
      document.getElementById('inspCharCount').textContent = `${transcript.length}/500`;
    } else if (currentScreen === 'inspiration' && currentFullInspTab === 'voice') {
      fullTextarea.value = transcript;
    }
    
    // Update status
    const voiceStatus = document.getElementById('voiceStatus');
    const fullVoiceStatus = document.getElementById('fullVoiceStatus');
    if (voiceStatus) voiceStatus.textContent = '🎙️ 正在识别中... ' + transcript.slice(-20);
    if (fullVoiceStatus) fullVoiceStatus.textContent = '🎙️ 正在识别中... ' + transcript.slice(-20);
  };
  
  rec.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    stopVoiceRecord();
    if (event.error === 'not-allowed') {
      showToast('请允许麦克风权限');
    }
  };
  
  rec.onend = () => {
    if (isRecording) {
      // Auto-restart if still in recording mode
      try { rec.start(); } catch(e) {}
    }
  };
  
  return rec;
}

// ---- Toggle Voice Recording ----
async function toggleVoiceRecord() {
  if (isRecording) {
    stopVoiceRecord();
    return;
  }
  
  try {
    // Request microphone permission
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Try Web Speech API first (for transcription)
    recognition = initSpeechRecognition();
    if (recognition) {
      recognition.start();
    } else {
      // Fallback: use MediaRecorder for audio recording
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Save voice recording
        const items = getInspirations();
        items.unshift({
          type: 'voice',
          content: '[语音记录]',
          audioUrl,
          time: new Date().toISOString()
        });
        saveInspirations(items);
        loadInspirations();
        updateStats();
        renderFullInspirations();
        showToast('语音已保存 🎙️');
        
        // Stop all tracks
        stream.getTracks().forEach(t => t.stop());
      };
      
      mediaRecorder.start();
    }
    
    isRecording = true;
    updateVoiceButtonState(true);
    
  } catch (err) {
    console.error('Failed to start recording:', err);
    showToast('无法访问麦克风，请检查权限设置');
  }
}

function stopVoiceRecord() {
  isRecording = false;
  
  // Stop speech recognition
  if (recognition) {
    try { recognition.stop(); } catch(e) {}
    recognition = null;
  }
  
  // Stop MediaRecorder
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    mediaRecorder = null;
  }
  
  updateVoiceButtonState(false);
}

function updateVoiceButtonState(recording) {
  const homeBtn = document.getElementById('voiceRecordBtn');
  const fullBtn = document.getElementById('fullVoiceRecordBtn');
  const voiceStatus = document.getElementById('voiceStatus');
  const fullVoiceStatus = document.getElementById('fullVoiceStatus');
  
  if (recording) {
    if (homeBtn) {
      homeBtn.textContent = '⏹️ 停止录音';
      homeBtn.classList.add('recording');
    }
    if (fullBtn) {
      fullBtn.textContent = '⏹️ 停止录音';
      fullBtn.classList.add('recording');
    }
  } else {
    if (homeBtn) {
      homeBtn.textContent = '🎙️ 点击开始录音';
      homeBtn.classList.remove('recording');
    }
    if (fullBtn) {
      fullBtn.textContent = '🎙️ 点击开始录音';
      fullBtn.classList.remove('recording');
    }
    if (voiceStatus) voiceStatus.textContent = '';
    if (fullVoiceStatus) fullVoiceStatus.textContent = '';
  }
}
