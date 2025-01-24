const fs = require('fs');
const ytpl = require('ytpl'); // Fetch playlists with pagination
const youtubedl = require('youtube-dl-exec'); // Download videos/audio
const path = require('path');

/**
 * Sanitizes a filename by removing invalid characters
 * @param {string} filename - The filename to sanitize
 * @returns {string} - The sanitized filename
 */
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[<>:"/\\|?*]+/g, '') // Remove invalid characters
    .replace(/\s+/g, ' ')          // Replace multiple spaces with single space
    .trim();                       // Remove leading/trailing spaces
};

/**
 * Downloads a single video as MP3.
 * @param {string} videoUrl - The URL of the YouTube video.
 * @param {string} title - The title of the video.
 * @param {string} outputPath - The path where the MP3 will be saved.
 * @returns {Promise<boolean>} - Resolves to true if download is successful, false otherwise.
 */
const downloadAsMp3 = async (videoUrl, title, outputPath) => {
  try {
    console.log(`Downloading: ${title}`);
    console.log(`URL: ${videoUrl}`);

    await youtubedl(videoUrl, {
      extractAudio: true,
      audioFormat: 'mp3',
      output: outputPath,
      noPlaylist: true,
    });

    console.log(`Completed: ${title}\n`);
    return true;
  } catch (err) {
    console.log(`Failed: ${title}`);
    console.log(`Error: ${err.message}\n`);
    return false;
  }
};

/**
 * Reads the list of already downloaded videos from a JSON file.
 * @param {string} filePath - Path to the JSON file.
 * @returns {Set<string>} - Set of downloaded video IDs.
 */
const getDownloadedVideos = (filePath) => {
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath);
    try {
      const list = JSON.parse(data);
      return new Set(list);
    } catch {
      return new Set();
    }
  }
  return new Set();
};

/**
 * Saves the list of downloaded videos to a JSON file.
 * @param {string} filePath - Path to the JSON file.
 * @param {Set<string>} downloadedSet - Set of downloaded video IDs.
 */
const saveDownloadedVideos = (filePath, downloadedSet) => {
  const list = Array.from(downloadedSet);
  fs.writeFileSync(filePath, JSON.stringify(list, null, 2));
};

/**
 * Processes a batch of videos with limited concurrency.
 * @param {Array} items - Array of playlist items.
 * @param {number} completedVideos - Number of videos completed so far.
 * @param {number} totalVideos - Total number of videos in the playlist.
 * @param {string} downloadFolder - Directory to save downloads.
 * @param {Function} onProgressCallback - Callback for progress updates.
 * @param {number} concurrentDownloads - Number of concurrent downloads.
 * @param {Array} abortControllers - Array to store AbortControllers.
 * @param {Set<string>} downloadedSet - Set of downloaded video IDs.
 * @param {string} downloadedFilePath - Path to the downloaded videos JSON file.
 * @returns {Promise<number>} - Resolves to the updated total number of completed videos.
 */
const processBatch = async (
  items,
  completedVideos,
  totalVideos,
  downloadFolder,
  onProgressCallback,
  concurrentDownloads,
  abortControllers,
  downloadedSet,
  downloadedFilePath
) => {
  const itemsToDownload = items.filter(item => !downloadedSet.has(item.id));
  
  if (itemsToDownload.length === 0) {
    console.log('No new videos to download in this batch');
    return completedVideos;
  }

  console.log(`Found ${itemsToDownload.length} new videos to download\n`);
  
  const downloadPromises = itemsToDownload.map(async (item) => {
    const controller = new AbortController();
    abortControllers.push(controller);
    const outputPath = path.join(downloadFolder, `${sanitizeFilename(item.title)}.mp3`);

    try {
      const success = await downloadAsMp3(item.url, item.title, outputPath);
      if (success) {
        downloadedSet.add(item.id);
        saveDownloadedVideos(downloadedFilePath, downloadedSet);
        return true;
      }
      return false;
    } finally {
      const index = abortControllers.indexOf(controller);
      if (index > -1) abortControllers.splice(index, 1);
    }
  });

  const results = await Promise.all(downloadPromises);
  const newlyCompleted = results.filter(Boolean).length;
  const newTotal = completedVideos + newlyCompleted;
  
  console.log(`Batch progress: ${newlyCompleted}/${itemsToDownload.length} downloaded`);
  console.log(`Total progress: ${newTotal}/${totalVideos}\n`);
  
  return newTotal;
};

/**
 * Manages the download of the entire playlist with concurrency and batching.
 * Downloads up to `concurrentDownloads` videos at a time and processes in batches.
 * @param {string} playlistUrl - The URL of the YouTube playlist.
 * @param {Function} onProgressCallback - Callback for progress updates.
 * @param {number} batchSize - Number of videos to fetch and download in each batch.
 * @param {number} concurrentDownloads - Number of concurrent downloads.
 * @param {Array} abortControllers - Array to store AbortControllers.
 * @returns {Promise<void>} - Resolves when all downloads are complete.
 */
const downloadPlaylist = async (playlistUrl, onProgressCallback, batchSize = 10, concurrentDownloads = 5, abortControllers = []) => {
  try {
    console.log('Starting playlist download...');
    
    let page = 1;
    let totalVideos = 0;
    let completedVideos = 0;
    let fetchedAll = false;

    const downloadFolder = path.resolve(__dirname, 'download');
    if (!fs.existsSync(downloadFolder)) fs.mkdirSync(downloadFolder, { recursive: true });

    const downloadedFilePath = path.join(downloadFolder, 'downloaded-videos.json');
    const downloadedSet = getDownloadedVideos(downloadedFilePath);

    while (!fetchedAll) {
      const playlist = await ytpl(playlistUrl, { limit: batchSize, page });

      if (page === 1) {
        console.log(`\nPlaylist: ${playlist.title}`);
        console.log(`Channel: ${playlist.author.name}`);
        console.log(`Videos: ${playlist.estimatedItemCount}\n`);
        totalVideos = playlist.estimatedItemCount;
      }

      const items = playlist.items;
      if (items.length === 0) break;

      console.log(`Processing batch ${page}...`);
      
      completedVideos = await processBatch(
        items, 
        completedVideos, 
        totalVideos, 
        downloadFolder, 
        onProgressCallback, 
        concurrentDownloads, 
        abortControllers,
        downloadedSet,
        downloadedFilePath
      );

      if (!playlist.continuation) {
        fetchedAll = true;
      } else {
        page++;
      }
    }

    console.log('Download completed!');
    if (onProgressCallback) onProgressCallback({ type: 'complete' });
  } catch (error) {
    console.log('Error:', error.message);
    if (onProgressCallback) {
      onProgressCallback({
        type: 'error',
        message: `Error: ${error.message}`,
      });
    }
    throw error;
  }
};

// Queue states
const QUEUE_STATE = {
  PENDING: 'pending',
  DOWNLOADING: 'downloading',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

class DownloadManager {
  constructor(downloadFolder) {
    this.downloadFolder = downloadFolder;
    this.masterQueue = [];      // All tracks from playlist
    this.activeQueue = [];      // Currently downloading (max 5)
    this.completedQueue = [];   // Successfully downloaded
    this.failedQueue = [];      // Failed downloads
    this.maxConcurrent = 5;
    this.isProcessing = false;
  }

  async initializeFromPlaylist(playlistUrl, onProgressCallback) {
    try {
      console.log('Fetching playlist metadata...');
      const playlist = await ytpl(playlistUrl, { limit: Infinity });
      
      console.log(`\nPlaylist: ${playlist.title}`);
      console.log(`Total tracks: ${playlist.items.length}`);

      // Create master queue
      this.masterQueue = playlist.items.map(item => ({
        id: item.id,
        title: item.title,
        url: item.url,
        state: QUEUE_STATE.PENDING,
        attempts: 0
      }));

      // Load existing downloads
      this.loadExistingDownloads();
      
      return {
        title: playlist.title,
        total: this.masterQueue.length,
        pending: this.getPendingCount(),
      };
    } catch (error) {
      console.error('Failed to initialize playlist:', error);
      throw error;
    }
  }

  loadExistingDownloads() {
    const files = fs.readdirSync(this.downloadFolder);
    files.forEach(file => {
      if (file.endsWith('.mp3')) {
        const track = this.masterQueue.find(t => 
          `${sanitizeFilename(t.title)}.mp3` === file
        );
        if (track) {
          track.state = QUEUE_STATE.COMPLETED;
          this.completedQueue.push(track);
        }
      }
    });
  }

  async processQueue(onProgressCallback) {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.getPendingCount() > 0) {
        // Fill active queue
        while (this.activeQueue.length < this.maxConcurrent) {
          const nextTrack = this.getNextPendingTrack();
          if (!nextTrack) break;
          
          nextTrack.state = QUEUE_STATE.DOWNLOADING;
          this.activeQueue.push(nextTrack);
        }

        if (this.activeQueue.length === 0) break;

        // Process active downloads
        const downloadPromises = this.activeQueue.map(track => 
          this.downloadTrack(track, onProgressCallback)
        );

        await Promise.all(downloadPromises);

        // Update queues
        this.activeQueue = this.activeQueue.filter(track => 
          track.state === QUEUE_STATE.DOWNLOADING
        );

        // Report progress
        const progress = {
          completed: this.completedQueue.length,
          total: this.masterQueue.length,
          active: this.activeQueue.length,
          pending: this.getPendingCount()
        };

        if (onProgressCallback) {
          onProgressCallback({
            type: 'progress',
            data: progress
          });
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  async downloadTrack(track, onProgressCallback) {
    const outputPath = path.join(this.downloadFolder, `${sanitizeFilename(track.title)}.mp3`);
    
    try {
      console.log(`Downloading: ${track.title}`);
      await downloadAsMp3(track.url, track.title, outputPath);
      
      track.state = QUEUE_STATE.COMPLETED;
      this.completedQueue.push(track);
      console.log(`Completed: ${track.title}`);
      
      return true;
    } catch (error) {
      console.log(`Failed: ${track.title} - ${error.message}`);
      track.state = QUEUE_STATE.FAILED;
      track.error = error.message;
      this.failedQueue.push(track);
      return false;
    } finally {
      const index = this.activeQueue.indexOf(track);
      if (index > -1) this.activeQueue.splice(index, 1);
    }
  }

  getPendingCount() {
    return this.masterQueue.filter(t => t.state === QUEUE_STATE.PENDING).length;
  }

  getNextPendingTrack() {
    return this.masterQueue.find(t => t.state === QUEUE_STATE.PENDING);
  }
}

// Export the manager
module.exports = { DownloadManager }; 