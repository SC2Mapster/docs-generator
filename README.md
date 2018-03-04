# StarCraft 2 - API Reference for Galaxy \*

*(\* and hopefully UI and data in the future)*

## Contributions guide

**Requiments:** `node` and `npm`

**Installation:** Clone repo, then `npm install`

**Usage:**

> `npm run reindex`\
Build index storage, required to generate doc pages.

> `npm run build`\
Build doc pages

> `gulp serve`\
Host local server for serving doc pages. `nodemon` & `browsersync` is used to aid with development - any change in templates/css will cause an reload.

### TOOO
- [ ] Adapt [nunjucks](https://github.com/mozilla/nunjucks) as templateing system; utilize HTML for better content structuring
- [ ] Add search functionality
- [ ] Insert graphical labels from Trigger Editor
- [ ] Add Table of Concepts for listing pages
- [ ] Attempt to recognize mentions about other functions in Hint of function, and link them properly. Example: Last Created Revealer
- [ ] Generate basic info pages for bult-in types and link them in each entry
- [ ] Investigate populating examples/usage section using data from external maps
- [ ] Add link to symbol pointing to declaration within the source file
- [ ] Add *Usage* section for every of preset values
- [ ] Extend code highlighter with Galaxy specific keywords
- [ ] Strikethrough deprecated galaxy entries
- [ ] Find consistent way for generating Anchor names, so they can be used to link from entry -> back to specific category on the list
- [ ] Work on page meta tags - title, og:property, favicon etc.
- [ ] Dump natives from executable that aren't listed within GameData files (likely nothing useful there)