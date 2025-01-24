const downloadButton = document.getElementById('download-button');
const stopButton = document.getElementById('stop-button');
const playlistUrlInput = document.getElementById('playlist-url');
const progressBar = document.getElementById('progress-bar');
const progressPercentage = document.getElementById('progress-percentage');
const currentTrackDisplay = document.getElementById('current-track');
const darkModeToggle = document.getElementById('dark-mode-toggle');

// Start Download Button
downloadButton.addEventListener('click', () => {
  const playlistUrl = playlistUrlInput.value.trim();
  if (playlistUrl) {
    // Reset progress
    progressBar.value = 0;
    progressPercentage.textContent = '0%';
    currentTrackDisplay.textContent = 'Current Track: None';
    window.api.startDownload(playlistUrl);
  } else {
    alert('Please enter a valid playlist URL!');
  }
});

// Stop Download Button
stopButton.addEventListener('click', () => {
  window.api.stopDownload();
  alert('Download stopped.');
  // Reset progress
  progressBar.value = 0;
  progressPercentage.textContent = '0%';
  currentTrackDisplay.textContent = 'Current Track: None';
});

// Listen for progress updates
window.api.onProgress((percent) => {
  progressBar.value = percent;
  progressPercentage.textContent = `${percent.toFixed(2)}%`;
});

// Listen for download completion
window.api.onComplete(() => {
  alert('🎉 Download Complete!');
  progressBar.value = 100;
  progressPercentage.textContent = '100%';
  currentTrackDisplay.textContent = 'Current Track: None';
});

// Listen for errors
window.api.onError((error) => {
  alert(`🚨 Error: ${error}`);
});

// Dark Mode Toggle
darkModeToggle.addEventListener('change', (event) => {
  if (event.target.checked) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}); 