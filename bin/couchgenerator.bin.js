#!/usr/bin/env node

const syntax = 
`Syntax:
--url/-u           (COUCH_URL)           CouchDB URL                        (required)
--database/--db/-d (COUCH_DATABASE)      CouchDB Datbase name               (required)
--template/-t      (COUCH_DOC_TEMPLATE)  The path to the document template  (default: ./templates/user.txt )
`
const url = process.env.COUCH_URL || 'http://localhost:5984'
const db = process.env.COUCH_DATABASE
const template = process.env.COUCH_DOC_TEMPALTE
const { parseArgs } = require('node:util')
const argv = process.argv.slice(2)
const options = {
  url: {
    type: 'string',
    short: 'u',
    default: url
  },
  database: {
    type: 'string',
    short: 'd',
    default: db
  },
  db: {
    type: 'string',
    default: db
  },
  template: {
    type: 'string',
    short: 't'
  },
  help: {
    type: 'boolean',
    short: 'h',
    default: false
  }
}

// parse command-line options
const { values } = parseArgs({ argv, options })

// help mode
if (values.help) {
  console.log(syntax)
  process.exit(0)
}

// db is an alias of database
if (values.db) {
  values.database = values.db
  delete values.db
}

const couchgenerator = require('../index.js')
couchgenerator({
  url: values.url,
  db: values.database,
  template: values.template
})
