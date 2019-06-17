# StarCraft 2 - API documentation generator

For Galaxy script and SC2Layout.

**Requiments:**

- `node`
- `yarn`

**Installation:**

Clone repo, then `yarn install`, `git submodule init`, `git submodule update`

**Usage:**

> `yarn run reindex`

Build index storage, required to generate Galaxy doc pages.

> `yarn run build`

Build doc pages

> `yarn run serve`

Host local server for serving doc pages. `nodemon` & `browsersync` is used to aid with development - any change in templates/css will cause an reload.
