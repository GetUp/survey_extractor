# run

use the heroku app https://dashboard.heroku.com/apps/survey-extractor it's already configured with the ID creds, etc.

`heroku run:detached SURVEY_ID=4582397 node index.js`

# dev

rename `.env.sample`, leave the rest of the vars for the command, like so:

`START=1000 PAGES=2 RESULTS=3 SURVEY_ID=4200000 node index.js`


NB: `hashids_alpha` is missing a lowercase 'd' to match Tijuana (old tokens began with a 'd').  You'll need to get `HASHIDS_SALT` from Tijuana prod.
