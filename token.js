require('dotenv').config()
const Hashids = require('hashids')
const hashids_salt = process.env.HASHIDS_SALT
const hashids_min_length = 1
const hashids_alpha = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcefghijklmnopqrstuvwxyz'
const hashids = new Hashids(hashids_salt, hashids_min_length, hashids_alpha)
hashids.decode()
