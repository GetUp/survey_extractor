require('dotenv').config()
const rp = require('request-promise-native')
const m = require('moment-timezone')
const Hashids = require('hashids')

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

const hashids_salt = process.env.HASHIDS_SALT
const hashids_min_length = 1
const hashids_alpha = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcefghijklmnopqrstuvwxyz'
const hashids = new Hashids(hashids_salt, hashids_min_length, hashids_alpha)

const identity_api = process.env.IDENTITY_API
const identity_api_auth = { api_token: process.env.IDENTITY_API_TOKEN }

let survey_name
let email_question_id = process.env.EMAIL_QUESTION_ID

const extract_utm = ({ utm_source, utm_medium, utm_campaign }) => {
  return {
    "source": utm_source && utm_source.value,
    "medium": utm_medium && utm_medium.value,
    "campaign": utm_campaign && utm_campaign.value,
  }
}

const identify_member = (email_question, uid_var, token_var) => {
  const email_answer = (email_question && email_question.answer) || ''
  const email = email_answer.match(/\S+@\S+/) && email_answer.match(/\S+@\S+/)[0]
  if (email) return { emails: [{ email }] }

  // uid param passed from TJ
  const tijuana = uid_var && uid_var.value
  if (tijuana) return { external_ids: { tijuana } }

  // fallback to token
  const token = token_var && token_var.value
  const user_id = hashids.decode(token)[0]
  if (user_id) return { external_ids: { tijuana: user_id } }

  // give up
  return null
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
  if (meta.is_test_data == 1) return null
  const source = extract_utm(meta.url_variables)
  const create_dt = m.tz(meta.date_submitted, "YYYY-MM-DD HH:mm:ss", 'America/New_York').utc()
  const cons_hash = identify_member(survey_data[email_question_id], meta.url_variables["uid"], meta.url_variables["t"])
  if (cons_hash === null) {
    console.log(`could not identify member for response ${meta.id}`)
    return null
  }
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

const set_meta = async (qs) => {
  const response = await rp({ uri: survey, qs, json: true })
  if (typeof email_question_id === 'undefined') {
    const email_question = response.data.pages
      .reduce((questions, page) => questions.concat(page.questions), []) //flatMap
      .find(q => q.properties.subtype == 'EMAIL')
    email_question_id = email_question && email_question.id
  }
  survey_name = response.data.title
}

const send = async (body) => rp({ method: 'POST', uri: identity_api, body, json: true })

const fetch = async (page, finish_page) => {
  if (page > finish_page) return
  const qs = Object.assign({ page }, params)
  const response = await rp({ uri, qs, json: true })
  const payloads = await response.data.map(response_mapper).filter(Boolean)
  for (const payload of payloads) {
    if (!process.env.HEROKU) process.stdout.write(".")
    await send(payload)
  }
  console.log(`\npage ${page} of ${finish_page} done`)
  return fetch(page + 1, (last_page || response.total_pages))
}

(async () => {
  await set_meta(auth)
  return fetch(first_page, last_page)
})().catch(console.error.bind(console))
