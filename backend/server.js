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
        const url = process.env.JELLYFIN_URL + `/Items?parentId=${process.env.JELLYFIN_LIBRARY_ID}&fields=OriginalTitle,ExternalUrls&enableTotalRecordCount=true&enableImages=true`;
        const response = await axios.get(url, {
            headers: {
                'X-Emby-Token': process.env.JELLYFIN_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        // Strip everything but Name, OriginalTitle, and ExternalUrls
        response.data.Items = response.data.Items.map(item => ({
            Name: item.Name,
            OriginalTitle: item.OriginalTitle,
            ExternalUrls: item.ExternalUrls
        }));

        res.json(response.data.Items);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to fetch movies' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
