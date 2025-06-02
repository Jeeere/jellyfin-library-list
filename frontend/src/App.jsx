import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch movies from backend
    const fetchMovies = async () => {
      try {
        const response = await axios.get('/api/getMovies');
        setMovies(response.data);

        if (response.status === 200) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching movies:', error);
      }
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
          <div className="movie" key={movie.OriginalTitle}>
            {movie.ExternalUrls && movie.ExternalUrls[1] && (
            <a href={movie.ExternalUrls[1]["Url"]} target="_blank" rel="noopener noreferrer">
              <h2>{movie.OriginalTitle}</h2>
            </a>
          )}
          </div>
        ))}
      </div>
    </>
  )
}

export default App
