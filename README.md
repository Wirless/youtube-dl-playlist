![image](https://github.com/user-attachments/assets/2d3e5317-632f-4da5-9388-26f695d71aee)


YouTube Playlist Downloader
A simple Node.js tool for downloading videos from YouTube playlists in WEBM format. This project uses ytpl to fetch all videos in a playlist and youtube-dl-exec to download them as WEBM files.

⚠️ Important: YouTube serves some algorithmically generated lists, such as "Mix" playlists, which are not actual playlists and cannot be downloaded. Please use valid, publicly available playlist URLs.

Features
Download all videos from a YouTube playlist as WEBM files.
Automatically organize downloads into folders named after the playlist.
Handles large playlists with pagination.
Simple, efficient, and lightweight.
Requirements
Before using this tool, make sure you have the following:

Node.js 14+
Install Dependencies
Run the following command to install the required Node.js libraries:

#    "electron": "^25.3.1"
##   "fluent-ffmpeg": "^2.1.3"
##    "yt-dlp-exec": "^1.0.2"
##    "ytpl": "2.3.0"
##   "ffmpeg-static": "^5.2.0"

Installation
Clone the repository:


git clone https://github.com/your-username/youtube-playlist-dl.git
cd youtube-playlist-dl
Install dependencies:

#( this will read package.json and install the required stuff)
npm install
# this will start the software
npm start
