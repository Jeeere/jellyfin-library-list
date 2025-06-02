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
        const response = await axios.get('http://localhost:3000/getMovies');
        console.log(response.data); // REMOVE
        setMovies(response.data);
      } catch (error) {
        console.error('Error fetching movies:', error);
      }
    };

    fetchMovies()
    setLoading(false);
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
            {movie.ExternalUrls && movie.ExternalUrls[1] && (
            <a href={movie.ExternalUrls[1]["Url"]} target="_blank" rel="noopener noreferrer">
              <h2>{movie.Name}</h2>
            </a>
          )}
          </div>
        ))}
      </div>
    </>
  )
}

export default App
