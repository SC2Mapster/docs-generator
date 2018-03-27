# StarCraft 2 - API Reference for Galaxy and Layouts

### Contributions guide

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

**General**
- [ ] Add Table of Concepts for listing pages
- [ ] Add search functionality - http://fusejs.io/
- [ ] Refine HTML meta tags - title, og:property, favicon etc.
- [ ] Try to get this shit to look better - refine CSS; sc2mapster brand color-scheme?

**Galaxy**
- [ ] Insert graphical labels from Trigger Editor
- [ ] Attempt to recognize mentions about other functions in Hint of function, and link them properly. Example: Last Created Revealer
- [ ] Generate basic info pages for bult-in types and link them in each entry
- [ ] Investigate populating examples/usage section using data from external maps
- [ ] Add link to symbol pointing to declaration within the source file
- [ ] Add *Usage* section for every of preset values
- [ ] Extend code highlighter with Galaxy specific keywords
- [ ] Strikethrough deprecated galaxy entries
- [ ] Dump natives from executable that aren't listed within GameData files (likely nothing useful there)

**UI**
- [ ] Finalize categorization of frames
- [ ] Usage examples for fields
- [ ] Usage examples for frames
- [ ] Include info about CFrameDesc elements and fields they define (CPortraitFrameDesc etc.)
- [ ] CDesc elements - constants etc.
- [ ] Move BattleUI to subpage?
- [ ] Applicable enum values list
- [ ] Applicable flags list
- [ ] State groups schema
- [ ] Animations/Controller schema
- [ ] Gather info about required sub frame definitions for Panel like frames
- [ ] Recognize frames located within GameUI, list them while including applicable path for overriding
- [ ] Add example maps shared by the community? For scrollbar and the like.
- [ ] Consider expaning automatically gathered informations with human contributions - frames/felds description and images/movies of certain frames *in action*.

**Missing CFrame info**
- [ ] class "CUnitStatusAbil" not found
- [ ] class "CBattleMapProfilePanel" not found
- [ ] class "CBattleUserBaseFrame" not found
- [ ] class "CBundleCacheFrame" not found
- [ ] class "CCampaignCacheFrame" not found
- [ ] class "CCommanderCacheFrame" not found
- [ ] class "CConsoleSkinCacheFrame" not found
- [ ] class "CLeagueRatingFrame" not found
- [ ] class "CLobbyPlayerSlotsPlayerContainerFrame" not found
- [ ] class "CMatchmakingLeagueIcon" not found
- [ ] class "CRaceCacheFrame" not found
- [ ] class "CScoreScreenStatsScoreValueFrame" not found
- [ ] class "CSkinCacheFrame" not found
- [ ] class "CUnitCacheFrame" not found
- [ ] class "CUserProfileLadderTeamsFrame" not found
- [ ] class "CVoicePackExampleLineFrame" not found
- [ ] class "CVoicePackFrame" not found
- [ ] class "CGraphItemFrame" not found
- [ ] class "CInputMethodCandidateList" not found
- [ ] class "CInputMethodReadingFrame" not found
- [ ] class "CInputMethodLanguageFrame" not found
- [ ] class "CDateFormatFrame" not found
- [ ] class "CGraphLegendItemFrame" not found
- [ ] class "CTextFormatFrame" not found
- [ ] class "CTimeFormatFrame" not found