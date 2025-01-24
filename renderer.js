const downloadButton = document.getElementById('download-button');
const stopButton = document.getElementById('stop-button');
const playlistUrlInput = document.getElementById('playlist-url');
const progressBar = document.getElementById('progress-bar');
const progressPercentage = document.getElementById('progress-percentage');
const activeDownloadsDiv = document.getElementById('active-downloads');
const playlistInfoDiv = document.getElementById('playlist-info');
const darkModeToggle = document.getElementById('dark-mode-toggle');

function updateActiveDownloads(progress) {
  const { completed, total, active, pending } = progress.data;
  
  // Update overall progress
  const percentComplete = (completed / total) * 100;
  progressBar.value = percentComplete;
  progressPercentage.textContent = `${percentComplete.toFixed(1)}%`;
  
  // Update playlist info
  playlistInfoDiv.innerHTML = `
    <p>Total tracks: ${total}</p>
    <p>Completed: ${completed}</p>
    <p>Active downloads: ${active}</p>
    <p>Pending: ${pending}</p>
  `;
}

// Start Download Button
downloadButton.addEventListener('click', () => {
  const playlistUrl = playlistUrlInput.value.trim();
  if (playlistUrl) {
    // Reset UI
    progressBar.value = 0;
    progressPercentage.textContent = '0%';
    playlistInfoDiv.innerHTML = 'Loading playlist...';
    activeDownloadsDiv.innerHTML = '';
    window.api.startDownload(playlistUrl);
  } else {
    alert('Please enter a valid playlist URL!');
  }
});

// Stop Download Button
stopButton.addEventListener('click', () => {
  window.api.stopDownload();
  activeDownloadsDiv.innerHTML = '';
  playlistInfoDiv.innerHTML = 'Download stopped';
});

// Listen for playlist loaded
window.api.onPlaylistLoaded((info) => {
  playlistInfoDiv.innerHTML = `
    <h3>${info.title}</h3>
    <p>Total tracks: ${info.total}</p>
    <p>New tracks to download: ${info.pending}</p>
  `;
});

// Listen for progress updates
window.api.onProgress((progress) => {
  updateActiveDownloads(progress);
});

// Listen for download completion
window.api.onComplete(() => {
  playlistInfoDiv.innerHTML += '<p class="success">Download Complete!</p>';
  activeDownloadsDiv.innerHTML = '';
});

// Listen for errors
window.api.onError((error) => {
  playlistInfoDiv.innerHTML += `<p class="error">Error: ${error}</p>`;
});

// Dark Mode Toggle
darkModeToggle.addEventListener('change', (event) => {
  if (event.target.checked) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}); 