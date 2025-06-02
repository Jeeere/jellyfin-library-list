# jellyfin-library-list
Frontend + backend for hosting a site that allows you to share a list of your available media with others without exposing your Jellyfin server.

## How to
### Prepare `.env`
Create a `.env` file in the `/backend` directory with the following, replacing the bracketed text with your own information:
```
NODE_ENV="production"
FRONTEND_URL={url to the site to be hosted}
JELLYFIN_URL={jellyfin url}
JELLYFIN_API_KEY={jellyfin api key}
JELLYFIN_LIBRARY_ID={wanted library id}
```
`JELLYFIN_LIBRARY_ID` can be gotten from `{JELLYFIN_URL}/Items` using the header `X-Emby-Token={JELLYFIN_API_KEY}`.

### Run
- In the `/frontend` directory, run `npm install` and `npm run build`
- In the root directory, run `docker compose -f docker_compose.yml up`

### After
Set up Nginx to add the backend as a custom location `/api`.
