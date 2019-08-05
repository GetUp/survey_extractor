require('dotenv').config()
const rp = require('request-promise-native')

const uri = `https://restapi.surveygizmo.com/v5/survey`
const api_token = process.env.SG_API_TOKEN
const api_token_secret = process.env.SG_API_SECRET
const first_page = parseInt(process.env.START, 10) || 1
const last_page = process.env.PAGES && parseInt(process.env.PAGES, 10) - 1 + first_page
const resultsperpage = parseInt(process.env.RESULTS, 10) || 100
const auth = { api_token, api_token_secret, }
const params = { ...auth, resultsperpage, }

const response_mapper = r =>
  [r.id, r.status, r.modified_on, `"${r.title}"`, r.statistics && r.statistics.Complete].join(',')

const fetch = async (page, finish_page) => {
  if (page > finish_page) return
  const qs = Object.assign({ page }, params)
  const response = await rp({ uri, qs, json: true })
  const csv = response.data.map(response_mapper).join('\n')
  console.log(csv)
  return fetch(page + 1, (last_page || response.total_pages))
}

(async () => {
  console.log('id,status,modified_on,title,responses')
  return fetch(first_page, last_page)
})().catch(console.error.bind(console))
