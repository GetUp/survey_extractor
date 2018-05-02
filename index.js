require('dotenv').config()
const rp = require('request-promise-native')
const Hashids = require('hashids')
const pgp = require('pg-promise')()

const survey_system = process.env.SURVEY_SYSTEM
const survey_id = process.env.SURVEY_ID
const survey = `https://restapi.surveygizmo.com/v5/survey/${survey_id}`
const uri = `${survey}/surveyresponse`
const api_token = process.env.SG_API_TOKEN
const api_token_secret = process.env.SG_API_SECRET
const first_page = parseInt(process.env.START, 10) || 1
const last_page = process.env.PAGES && parseInt(process.env.PAGES, 10) - 1 + first_page
const resultsperpage = parseInt(process.env.RESULTS, 10) || 100
const auth = { api_token, api_token_secret, }
const params = { ...auth, resultsperpage, }

const hashids_salt = process.env.HASHIDS_SALT
const hashids_min_length = 1
const hashids_alpha = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcefghijklmnopqrstuvwxyz'
const hashids = new Hashids(hashids_salt, hashids_min_length, hashids_alpha)

const db = pgp(process.env.DB_URL)
const table = process.env.TABLE
const columns = [
  'survey_system',
  'survey_id',
  'survey_name',
  'user_id',
  'survey_data',
  'meta',
]
const column_set = new pgp.helpers.ColumnSet(columns, {table})
let survey_name

const decode_token = hash => hashids.decode(hash)[0]

const response_mapper = ({ survey_data, ...meta }) => {
  const user_id = meta.url_variables["t"] && decode_token(meta.url_variables["t"].value)
  return {
    survey_system,
    survey_id,
    survey_name,
    user_id,
    survey_data,
    meta,
  }
}

const get_name = async (qs) => {
  const response = await rp({ uri: survey, qs, json: true })
  return response.data.title
}

const fetch = async (page, finish_page) => {
  if (page > finish_page) return

  const qs = Object.assign({page}, params)
  const response = await rp({ uri, qs, json: true })
  const records = response.data.map(response_mapper)
  await db.none(pgp.helpers.insert(records, column_set))
  console.log(`page ${page} of ${finish_page} done`)
  fetch(page + 1, (last_page || response.total_pages))
}

(async () => {
  survey_name = await get_name(auth)
  return fetch(first_page, last_page)
})().catch(console.error.bind(console))
