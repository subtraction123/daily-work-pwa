/* ========== BBC Audio Player ========== */

let audioContext = null;
let isAudioPlaying = false;

// BBC News podcast RSS feed URL (latest world news bulletin)
const BBC_AUDIO_URLS = [
  'https://podcasts.files.bbci.co.uk/p02nq0gn.rss', // Global News Podcast
  'https://podcasts.files.bbci.co.uk/p02nq0ln.rss', // Newshour
];

// ---- Simulated Audio Player ----
// Since actual BBC audio streaming requires CORS and may be blocked,
// we use the Web Speech API to read the text content as an alternative
// This provides real English listening practice

async function toggleBBCAudio() {
  if (isAudioPlaying) {
    stopBBCAudio();
    return;
  }
  
  // Try to use Web Speech Synthesis to read the article
  if ('speechSynthesis' in window) {
    await playTextAsAudio();
  } else {
    showToast('浏览器不支持语音合成');
  }
}

async function playTextAsAudio() {
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();
  
  // Get the current article content
  let textToRead = '';
  
  if (currentArticle) {
    // Read the article summary + content
    textToRead = currentArticle.summary + '. ' + currentArticle.content
      .replace(/[#*\[\]()|-]/g, ' ')  // Remove markdown
      .replace(/\n+/g, '. ')           // Newlines to pauses
      .replace(/\s+/g, ' ')            // Collapse whitespace
      .trim();
  } else {
    textToRead = 'Welcome to BBC News listening practice. Please select an article to listen.';
  }
  
  // Split into sentences for better pacing
  const sentences = textToRead.match(/[^.!?]+[.!?]+/g) || [textToRead];
  
  isAudioPlaying = true;
  updateAudioButton(true);
  
  let progress = 0;
  const totalSentences = sentences.length;
  
  for (let i = 0; i < sentences.length; i++) {
    if (!isAudioPlaying) break;
    
    await speakSentence(sentences[i].trim());
    
    progress = Math.round(((i + 1) / totalSentences) * 100);
    updateProgressBars(progress);
  }
  
  isAudioPlaying = false;
  updateAudioButton(false);
  updateProgressBars(0);
}

function speakSentence(text) {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Find an English voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => 
      v.lang.startsWith('en') && v.name.includes('Daniel')
    ) || voices.find(v => 
      v.lang.startsWith('en') && v.name.includes('Samantha')
    ) || voices.find(v => 
      v.lang.startsWith('en-US')
    ) || voices.find(v => 
      v.lang.startsWith('en')
    );
    
    if (englishVoice) utterance.voice = englishVoice;
    utterance.lang = 'en-US';
    utterance.rate = 0.9;  // Slightly slower for learning
    utterance.pitch = 1.0;
    
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    
    window.speechSynthesis.speak(utterance);
  });
}

function stopBBCAudio() {
  isAudioPlaying = false;
  window.speechSynthesis.cancel();
  updateAudioButton(false);
  updateProgressBars(0);
}

function updateAudioButton(playing) {
  const buttons = document.querySelectorAll('.audio-play-btn');
  buttons.forEach(btn => {
    if (playing) {
      btn.textContent = '⏸';
      btn.classList.add('playing');
    } else {
      btn.textContent = '▶';
      btn.classList.remove('playing');
    }
  });
}

function updateProgressBars(percent) {
  const bars = document.querySelectorAll('.audio-progress-bar');
  bars.forEach(bar => {
    bar.style.width = percent + '%';
  });
}

// ---- Preload voices ----
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
  // Trigger voice loading
  window.speechSynthesis.getVoices();
}
