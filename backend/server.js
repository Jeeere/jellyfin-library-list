// Server for handling Jellyfin API requests
import dotenv from 'dotenv';
import express from 'express';
import axios from 'axios';
import cors from 'cors';

dotenv.config();
const app = express();
const PORT = 3000;

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

    try {
        // Fetch the movie image from Jellyfin
        const imageUrl = `${process.env.JELLYFIN_URL}/Items/${movieId}/Images/Primary`;
        const response = await axios.get(imageUrl, {
            headers: {
                'X-Emby-Token': process.env.JELLYFIN_API_KEY,
            },
            responseType: 'arraybuffer'
        });
        
        // Set the content type from the original response
        res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        res.send(response.data);
    } catch (error) {
        console.error('Error fetching movie image:', error);
        res.status(404).send('Image not found');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
