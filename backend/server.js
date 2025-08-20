// Server for handling Jellyfin API requests
import dotenv from 'dotenv';
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import cron from 'node-cron';

dotenv.config();
const app = express();
const PORT = 3000;

// Cache directory for compressed images
const CACHE_DIR = path.join(process.cwd(), 'cache', 'images');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Function to clear cache directory
function clearCache() {
    try {
        const files = fs.readdirSync(CACHE_DIR);
        for (const file of files) {
            const filePath = path.join(CACHE_DIR, file);
            fs.unlinkSync(filePath);
        }
        console.log(`Cleared ${files.length} cached images`);
    } catch (error) {
        console.error('Error clearing cache:', error);
    }
}

// Clear cache on server startup
console.log('Clearing image cache on startup...');
clearCache();

// Enable CORS for development only
if (process.env.NODE_ENV === 'development') {
  app.use(cors());
} else {
  // For production, specify exact origin
  app.use(cors({
    origin: process.env.FRONTEND_URL,
  }));
}

// Endpoint: GET /getMovies
app.get('/api/getMovies', async (req, res) => {
    // Perform a request to the jellyfin API to get movies
    try {
        const url = process.env.JELLYFIN_URL + `/Users/${process.env.JELLYFIN_USER_ID}/Items?parentId=${process.env.JELLYFIN_LIBRARY_ID}&fields=OriginalTitle,ExternalUrls,Genres,AirTime&enableTotalRecordCount=true&enableImages=true`;
        const response = await axios.get(url, {
            headers: {
                'X-Emby-Token': process.env.JELLYFIN_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        // Strip everything but Name, OriginalTitle, and ExternalUrls
        response.data.Items = response.data.Items
            .filter(item => !item.IsFolder)
            .map(item => ({
                Name: item.Name,
                OriginalTitle: item.OriginalTitle,
                Id: item.Id,
                Genres: item.Genres,
                AirTime: Math.round(item.RunTimeTicks / 600000000),
                ExternalUrls: item.ExternalUrls,
                Played: item.UserData.Played || false,
                PremiereDate: item.PremiereDate || null,
        }));

        res.json(response.data.Items);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to fetch movies' });
    }
});

// Endpoint: GET /getMovieImage
app.get('/api/getMovieImage/:id', async (req, res) => {
    const movieId = req.params.id;
    const cacheFilePath = path.join(CACHE_DIR, `${movieId}.jpg`);

    try {
        // Check if cached image exists
        if (fs.existsSync(cacheFilePath)) {
            // Serve cached image
            const cachedImage = fs.readFileSync(cacheFilePath);
            res.set('Content-Type', 'image/jpeg');
            res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
            return res.send(cachedImage);
        }

        // Fetch the movie image from Jellyfin
        const imageUrl = `${process.env.JELLYFIN_URL}/Items/${movieId}/Images/Primary`;
        const response = await axios.get(imageUrl, {
            headers: {
                'X-Emby-Token': process.env.JELLYFIN_API_KEY,
            },
            responseType: 'arraybuffer'
        });

        // Compress the image
        console.log(`Compressing image for movie ID: ${movieId}`);
        const compressedImage = await sharp(response.data)
            .jpeg({ quality: 6 })
            .toBuffer();

        // Save compressed image to cache
        try {
            fs.writeFileSync(cacheFilePath, compressedImage);
        } catch (cacheError) {
            console.warn('Failed to cache image:', cacheError.message);
            // Continue serving the image even if caching fails
        }

        res.set('Content-Type', 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        res.send(compressedImage);
    } catch (error) {
        console.error('Error fetching movie image:', error);
        res.status(404).send('Image not found');
    }
});

app.post('/api/triggerImageCheck', async (req, res) => {
    try {
        console.log('Manual image check triggered...');
        await checkImages();
        res.status(200).json({ success: true, message: 'Image check completed' });
    } catch (error) {
        console.error('Error during image check:', error);
        res.status(500).json({ error: 'Failed to check image updates', details: error.message });
    }
});

// Function to check and recompress updated images
async function checkImages() {
    console.log('Starting nightly image check...');

    try {
        // Get all movies from Jellyfin
        const url = process.env.JELLYFIN_URL + `/Users/${process.env.JELLYFIN_USER_ID}/Items?parentId=${process.env.JELLYFIN_LIBRARY_ID}`;
        const response = await axios.get(url, {
            headers: {
                'X-Emby-Token': process.env.JELLYFIN_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const movies = response.data.Items.filter(item => !item.IsFolder);
        console.log(`Checking ${movies.length} movies for image updates...`);

        // Create a set of valid movie IDs
        const validMovieIds = new Set(movies.map(movie => movie.Id));

        let updatedCount = 0;
        let deletedOrphanCount = 0;
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 55 * 1000);

        // Check for updated images
        for (const movie of movies) {
            try {
                const imageUrl = `${process.env.JELLYFIN_URL}/Items/${movie.Id}/Images/Primary`;
                
                // Get image headers to check last modified date
                const headResponse = await axios.head(imageUrl, {
                    headers: { 'X-Emby-Token': process.env.JELLYFIN_API_KEY }
                });

                const lastModified = headResponse.headers['last-modified'];
                
                if (lastModified) {
                    const lastModifiedDate = new Date(lastModified);
                    
                    // Check if image was modified in the past 24 hours
                    if (lastModifiedDate > twentyFourHoursAgo) {
                        // Delete old cached image if it exists
                        const cacheFilePath = path.join(CACHE_DIR, `${movie.Id}.jpg`);
                        if (fs.existsSync(cacheFilePath)) {
                            fs.unlinkSync(cacheFilePath);
                        }

                        // Fetch and compress the updated image
                        const imageResponse = await axios.get(imageUrl, {
                            headers: { 'X-Emby-Token': process.env.JELLYFIN_API_KEY },
                            responseType: 'arraybuffer'
                        });

                        const compressedImage = await sharp(imageResponse.data)
                            .jpeg({ quality: 6 })
                            .toBuffer();

                        // Save new compressed image
                        fs.writeFileSync(cacheFilePath, compressedImage);
                        updatedCount++;
                    }
                }
            } catch (error) {
                console.error(`Error checking image for movie ${movie.Name}:`, error.message);
            }
        }

        // Clean up orphaned cached images
        console.log('Checking for orphaned cached images...');
        try {
            const cachedFiles = fs.readdirSync(CACHE_DIR);
            const imageFiles = cachedFiles.filter(file => file.endsWith('.jpg'));
            
            for (const file of imageFiles) {
                const movieId = file.replace('.jpg', '');
                
                // If this movie ID doesn't exist in Jellyfin anymore, delete the cached image
                if (!validMovieIds.has(movieId)) {
                    const orphanedFilePath = path.join(CACHE_DIR, file);
                    fs.unlinkSync(orphanedFilePath);
                    deletedOrphanCount++;
                }
            }
        } catch (error) {
            console.error('Error cleaning up orphaned images:', error.message);
        }

        console.log(`Nightly image check completed. Updated ${updatedCount} images, deleted ${deletedOrphanCount} orphaned cached images.`);
    } catch (error) {
        console.error('Error during nightly image check:', error);
    }
}

// Schedule nightly image update check at 2 AM
cron.schedule('0 2 * * *', () => {
    checkImages();
}, {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
