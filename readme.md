
    CREATE TABLE "responses" (
        "survey_system" text,
        "survey_id" text,
        "survey_name" text,
        "response_id" integer,
        "user_id" integer,
        "survey_data" jsonb,
        "meta" jsonb,
        PRIMARY KEY ("survey_system", "survey_id", "response_id")
    );
    CREATE INDEX "responses_user_id_idx" ON "responses"("user_id");

rename `.env.sample`, leave the rest of the vars for the command, like so:

`START=1000 PAGES=2 RESULTS=3 SURVEY_ID=4200000 node index.js`


NB: `hashids_alpha` is missing a lowercase 'd' to match Tijuana (old tokens began with a 'd').  You'll need to get `HASHIDS_SALT` from Tijuana prod.
