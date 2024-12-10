const fs = require('fs')
const path = require('path')
const datamaker = require('datamaker')
const ccurllib = require('ccurllib')
const pkg = require('./package.json')
const h = {
  'user-agent': `${pkg.name}@${pkg.version}`,
  'content-type': 'application/json'
}

const sleep = async (t) => {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, t)
  })
}

const makeData = async (template) => {
  return new Promise((resolve, reject) => {
    let doc
    datamaker.generate(template, 'none', 1)
      .on('data', (d) => { doc = d })
      .on('end', () => { resolve(doc) })
  })
}

const generate = async (opts) => {
  const keycache = {}
  let i
  let ops = 0
  if (!opts.template) {
    opts.template = path.join(__dirname, 'templates', 'user.txt')
  }
  const template = fs.readFileSync(opts.template, { encoding: 'utf8' })

  do {
    // pick a batch size
    const batchSize = 10 + Math.floor(Math.random() * 5)
    const batch = []

    // generate a batch of writes
    for (i = 0; i < batchSize; i++) {
      const str = await makeData(template)
      const doc = JSON.parse(str)
      batch.push(doc)
    }

    // turn some of the writes into updates or deletes
    const keys = Object.keys(keycache)
    let inserts = batch.length
    let updates = 0
    let deletes = 0
    let reads = 0
    const deletedDocs = []
    for (i = 0; i < batchSize; i++) {
      if (Math.random() > 0.95 && keys.length > 0) {
        // make this an update
        const id = keys[0]
        batch[i]._id = id
        batch[i]._rev = keycache[id]
        keys.shift()
        updates++
        inserts--
      } else if (Math.random() > 0.95 && keys.length > 0) {
        // make this a delete
        const id = keys[0]
        batch[i] = {
          _id: id,
          _rev: keycache[id],
          _deleted: true
        }
        deletedDocs.push(id)
        keys.shift()
        delete keycache[id]
        deletes++
        inserts--
      }
    }

    // write it to the database
    ops += batch.length
    const req = {
      method: 'post',
      url: `${opts.url}/${opts.db}/_bulk_docs`,
      body: JSON.stringify({ docs: batch }),
      headers: h
    }
    const r = await ccurllib.request(req)
    const response = r.result

    // make a note of the new rev tokens
    for (i = 0; i < response.length; i++) {
      const r = response[i]
      if (r.ok) {
        if (!deletedDocs.includes(r.id)) {
          keycache[r.id] = r.rev
        }
      } else {
        console.log('error', r, keycache[r.id])
      }
    }

    // keep keycache size reasonable
    const ks = Object.keys(keycache)
    for (i = 0; i < ks.length; i++) {
      if (i > 5000) {
        delete keycache[ks[i]]
      }
    }

    // do some reads
    const kl = ks.length
    reads = Math.floor(Math.random() * 50)
    for (i = 0; i < reads; i++) {
      const k = ks[Math.floor(Math.random() * kl)]
      const req = {
        method: 'get',
        url: `${opts.url}/${opts.db}/${k}`,
        headers: h
      }
      const r = await ccurllib.request(req)
      const response = r.result
    }

    // do some queries
    queries = Math.floor(Math.random() * 10)
    for (i = 0; i < queries; i++) {
      const k = 65 + Math.floor(Math.random() * 26)
      const s = String.fromCharCode(k)
      const req = {
        method: 'get',
        url: `${opts.url}/${opts.db}/_all_docs`,
        qs: {
          starkey: s,
          limit: 10
        },
        headers: h
      }
      const r = await ccurllib.request(req)
      const response = r.result
    }


    console.log(new Date().toISOString(), { inserts, updates, deletes, reads, queries })


    // pause for breath
    await sleep(Math.random() * 1000)
  } while (1)
}

module.exports = generate
