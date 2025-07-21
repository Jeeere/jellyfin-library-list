import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [images, setImages] = useState({})

  useEffect(() => {
    // Fetch movies from backend
    const fetchMovies = async () => {
      try {
        const response = await axios.get('/api/getMovies');

        // Check for invalid content type
        const contentType = response.headers['content-type'];
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Backend server not available');
        }

        const sortedMovies = response.data.sort((a, b) => 
          a.Name.localeCompare(b.Name)
        );

        setMovies(sortedMovies);
        setLoading(false);

        fetchAllImages(sortedMovies);
      } catch (error) {
        console.error('Error fetching movies:', error);
      }
    };

    const fetchAllImages = async (movieList) => {
      const imagePromises = movieList.map(async (movie) => {
        try {
          const imageResponse = await axios.get(`/api/getMovieImage/${movie.Id}`, {
            responseType: 'blob'
          });
          const imageUrl = URL.createObjectURL(imageResponse.data);
          return { id: movie.Id, url: imageUrl };
        } catch (error) {
          console.error(`Error fetching image for ${movie.Name}:`, error);
          return { id: movie.Id, url: null };
        }
      });

      const imageResults = await Promise.all(imagePromises);
      const imageMap = {};
      imageResults.forEach(result => {
        imageMap[result.id] = result.url;
      });
      setImages(imageMap);
    };

    fetchMovies()
  }, []);

  if (loading) {
    return (
      <>
        <div className="loading">
          <h1>Loading...</h1>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="movies">
        {movies.map((movie) => (
          <div className="movie" key={movie.Name}>
            {images[movie.Id] && (
              <img 
                src={images[movie.Id]} 
                alt={movie.Name}
              />
            )}
            <div className="movie-details">
              {movie.ExternalUrls && movie.ExternalUrls[1] && (
                <a href={movie.ExternalUrls[1]["Url"]} target="_blank" rel="noopener noreferrer">
                  <strong>{movie.Name}</strong>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export default App
