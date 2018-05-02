
    CREATE TABLE "responses" (
        "id" serial,
        "survey_system" text,
        "survey_id" text,
        "survey_name" text,
        "user_id" integer,
        "survey_data" jsonb,
        "meta" jsonb,
        PRIMARY KEY ("id")
    );
    CREATE INDEX "responses_user_id_idx" ON "responses"("user_id");

rename `.env.sample`, leave the rest of the vars for the command, like so:

`START=1000 PAGES=2 RESULTS=3 SURVEY_ID=4200000 node index.js`


NB: `hashids_alpha` is missing a lowercase 'd' to match Tijuana (old tokens began with a 'd').  You'll need to get `HASHIDS_SALT` from Tijuana prod.
