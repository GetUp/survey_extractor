require('dotenv').config()
const rp = require('request-promise-native')
const m = require('moment-timezone')

// const survey_system = process.env.SURVEY_SYSTEM
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

// const Hashids = require('hashids')
// const hashids_salt = process.env.HASHIDS_SALT
// const hashids_min_length = 1
// const hashids_alpha = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcefghijklmnopqrstuvwxyz'
// const hashids = new Hashids(hashids_salt, hashids_min_length, hashids_alpha)
// const decode_token = hash => hashids.decode(hash)[0]
// const user_id = meta.url_variables["t"] && decode_token(meta.url_variables["t"].value)

const identity_api = process.env.IDENTITY_API
const identity_api_auth = { api_token: process.env.IDENTITY_API_TOKEN }

const email_question_id = process.env.EMAIL_QUESTION_ID

let survey_name

const extract_utm = ({utm_source, utm_medium, utm_campaign}) => {
  return {
    "source": utm_source && utm_source.value,
    "medium": utm_medium && utm_medium.value,
    "campaign": utm_campaign && utm_campaign.value,
  }
}

const transform_questions = (questions) => {
  return Object.entries(questions).map(([_, { type, question, answer, options }]) => {
    let answers
    if (options) answers = Object.entries(options).map(([_, v]) => v.option)
    return {
      question: {
        text: question,
        qtype: type
      },
      answer: answers || answer
    }
  })
}

const response_mapper = ({ survey_data, ...meta }) => {
  const source = extract_utm(meta.url_variables)
  const create_dt = m.tz(meta.date_submitted, "YYYY-MM-DD HH:mm:ss", 'America/New_York').utc()
  const email = survey_data[email_question_id].answer
  const cons_hash = { emails: [{ email }] }
  const survey_responses = transform_questions(survey_data)
  return {
    ...identity_api_auth,
    action_type: 'survey',
    action_technical_type: 'surveygizmo_survey',
    action_name: survey_name,
    // action_description: ,
    external_id: survey_id,
    source,
    create_dt,
    cons_hash,
    survey_responses,
  }
}

const get_name = async (qs) => {
  const response = await rp({ uri: survey, qs, json: true })
  return response.data.title
}

const send = async (body) => rp({ method: 'POST', uri: identity_api, body, json: true })

const logger = (p) => { console.log(JSON.stringify(p)) }

const fetch = async (page, finish_page) => {
  if (page > finish_page) return
  const qs = Object.assign({page}, params)
  const response = await rp({ uri, qs, json: true })
  const payloads = await response.data.map(response_mapper)
  for (const payload of payloads) {
    process.stdout.write(".")
    await send(payload)
  }
  console.log(`\npage ${page} of ${finish_page} done`)
  return fetch(page + 1, (last_page || response.total_pages))
}

(async () => {
  survey_name = await get_name(auth)
  return fetch(first_page, last_page)
})().catch(console.error.bind(console))
