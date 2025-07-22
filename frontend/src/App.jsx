import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  // Movie list states
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [images, setImages] = useState({})
  const [filteredMovies, setFilteredMovies] = useState([])

  // Filter states
  const [selectedGenres, setSelectedGenres] = useState([])
  const [watchStatus, setWatchStatus] = useState('all')
  const [availableGenres, setAvailableGenres] = useState([])

  // Sort states
  const [sortBy, setSortBy] = useState('name')

  // Functionality
  const [selectedFunction, setSelectedFunction] = useState('none')

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
        setFilteredMovies(sortedMovies);
        setLoading(false);

        // Set unique genres
        const allGenres = sortedMovies.flatMap(movie => movie.Genres || []);
        const uniqueGenres = [...new Set(allGenres)].sort();
        setAvailableGenres(uniqueGenres);

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

  useEffect(() => {
    let filtered = movies;

    // Filter by genres
    if (selectedGenres.length > 0) {
      filtered = filtered.filter(movie =>
        movie.Genres && movie.Genres.some(genre => selectedGenres.includes(genre))
      );
    }

    // Filter by watch status
    if (watchStatus === 'watched') {
      filtered = filtered.filter(movie => movie.Played);
    } else if (watchStatus === 'unwatched') {
      filtered = filtered.filter(movie => !movie.Played);
    }

    // Sort movies
    if (sortBy === 'name') {
      filtered = filtered.sort((a, b) => a.Name.localeCompare(b.Name));
    } else if (sortBy === 'release_date') {
      filtered = filtered.sort((a, b) => new Date(b.PremiereDate) - new Date(a.PremiereDate));
    }

    setFilteredMovies(filtered);
  }, [selectedGenres, watchStatus, movies, sortBy]);

  const handleGenreChange = (genre) => {
    setSelectedGenres(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const clearAllFilters = () => {
    setSelectedGenres([]);
    setWatchStatus('all');
  };

  const handleFiltersClick = () => {
    setSelectedFunction(prev => 
      prev === 'filters' ? 'none' : 'filters'
    );
  };

  const handleSortClick = () => {
    setSelectedFunction(prev =>
      prev === 'sort' ? 'none' : 'sort'
    );
  };

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
      <header className="header">
        <div className="header-main">
          <div className="header-search"></div>
          <div className="header-options">
            <div className={`header-sort ${selectedFunction === 'sort' ? 'selected' : ''}`} onClick={handleSortClick}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="h-6 w-6">
                <path fill-rule="evenodd" d="M2.25 4.5A.75.75 0 013 3.75h14.25a.75.75 0 010 1.5H3a.75.75 0 01-.75-.75zm0 4.5A.75.75 0 013 8.25h9.75a.75.75 0 010 1.5H3A.75.75 0 012.25 9zm15-.75A.75.75 0 0118 9v10.19l2.47-2.47a.75.75 0 111.06 1.06l-3.75 3.75a.75.75 0 01-1.06 0l-3.75-3.75a.75.75 0 111.06-1.06l2.47 2.47V9a.75.75 0 01.75-.75zm-15 5.25a.75.75 0 01.75-.75h9.75a.75.75 0 010 1.5H3a.75.75 0 01-.75-.75z" clip-rule="evenodd"></path>
              </svg>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="name">Title (A-Z)</option>
                <option value="release_date">Release Date Descending</option>
              </select>
            </div>
            <div className={`clickable-div ${selectedFunction === 'filters' ? 'selected' : ''}`} onClick={handleFiltersClick}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M3.792 2.938A49.069 49.069 0 0112 2.25c2.797 0 5.54.236 8.209.688a1.857 1.857 0 011.541 1.836v1.044a3 3 0 01-.879 2.121l-6.182 6.182a1.5 1.5 0 00-.439 1.061v2.927a3 3 0 01-1.658 2.684l-1.757.878A.75.75 0 019.75 21v-5.818a1.5 1.5 0 00-.44-1.06L3.13 7.938a3 3 0 01-.879-2.121V4.774c0-.897.64-1.683 1.542-1.836z" clip-rule="evenodd"></path>
              </svg>
              <span>{selectedGenres.length} Active Filters</span>
            </div>
          </div>
        </div>

        {selectedFunction === 'filters' && (
          <div className="header-filters">
            <div className="filters">
              <div className="filter-section">
                <h3>Genres</h3>
                <div className="genre-filters">
                  {availableGenres.map(genre => (
                    <div className={`clickable-div ${selectedGenres.includes(genre) ? 'selected' : ''}`} key={genre} onClick={() => handleGenreChange(genre)}>
                      {genre}
                    </div>
                  ))}
                </div>
              </div>

              <div className='filter-section'>
                <h3>Watch Status</h3>
                <div className='watch-status-filters'>
                  <div className={`clickable-div ${watchStatus === 'all' ? 'selected' : ''}`} onClick={() => setWatchStatus('all')}>
                    <span>All</span>
                  </div>
                  <div className={`clickable-div ${watchStatus === 'watched' ? 'selected' : ''}`} onClick={() => setWatchStatus('watched')}>
                    <span>Watched</span>
                  </div>
                  <div className={`clickable-div ${watchStatus === 'unwatched' ? 'selected' : ''}`} onClick={() => setWatchStatus('unwatched')}>
                    <span>Unwatched</span>
                  </div>
                </div>
              </div>

              <div className='genre-filters'>
                <button onClick={clearAllFilters} className="clear-filters-btn">
                  Clear All Filters
                </button>
                <span style={{
                  display: 'flex',
                  alignItems: 'center'
                }}>Showing {filteredMovies.length} of {movies.length} movies</span>
              </div>
        
            </div>
          </div>
        )}
      </header>

      <div className="movies">
        {filteredMovies.map((movie) => (
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
