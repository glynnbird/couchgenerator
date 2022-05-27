const fs = require('fs')
const path = require('path')
const datamaker = require('datamaker')
const Nano = require('nano')

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
  const nano = Nano(opts.url)
  const db = nano.db.use(opts.db)
  console.log(opts)
  if (!opts.template) {
    opts.template = path.join(__dirname, 'templates', 'user.txt')
  }
  const template = fs.readFileSync(opts.template, { encoding: 'utf8' })
  console.log(template)

  do {

    // pick a batch size
    const batchSize = 10 + Math.floor(Math.random() * 500)
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
    console.log(new Date().toISOString(), { inserts, updates, deletes, ops })
    const response = await db.bulk({ docs: batch })

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

    // pause for breath
    await sleep(Math.random() * 1000)
  } while (1)
}

module.exports = generate
