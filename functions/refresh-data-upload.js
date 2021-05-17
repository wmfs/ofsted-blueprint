const csvparse = require('csv-parse')
const fs = require('fs')

function readCsv (csvFile, importLog) {
  return new Promise((resolve, reject) => {
    let idx = 1

    fs.createReadStream(csvFile)
      .pipe(csvparse({ columns: true }))
      .on('data', row => {
        idx++

        const requiredProperties = [
          ['URN', 'urn'], // Column A: URN
          ['UPRN', 'uprn'], // Column DZ: UPRN
          ['EstablishmentName', 'establishmentName'], // Column E: EstablishmentName
          ['OfstedRating (name)', 'ofstedRating'] // Column DW: OfstedRating (name)
        ]

        const missingProperties = []

        for (const [prop] of requiredProperties) {
          if (!row[prop])  missingProperties.push(prop)
        }

        if (missingProperties.length === 0) {
          importLog.totalRows++
          const obj = {}

          for (const [source, target] of requiredProperties) {
            obj[target] = row[source]
          }

          importLog.rows.push(obj)
        } else {
          importLog.totalRejected++
          importLog.rejected.push({ idx, missingProperties })
        }
      })
      .on('error', reject)
      .on('end', resolve)
  })
}

function addUploadStatus (log) {
  const {
    totalRejected,
    totalRows
  } = log

  log.uploadGood = ''
  log.uploadWarning = ''
  log.uploadError = ''

  if (totalRows === 0) {
    log.uploadError = `0 rows to be uploaded.`
  } else if (totalRejected > 0) {
    log.uploadWarning = `${totalRows} rows to be uploaded but ${totalRejected} rows were rejected (see below).`
  } else {
    log.uploadGood = `${totalRows} rows to be uploaded.`
  }
}

async function processFile ({ serverFilename, clientFilename }) {
  const importLog = {
    serverFilename,
    clientFilename,
    startTime: new Date(),
    rows: [],
    rejected: [],
    totalRows: 0,
    totalRejected: 0
  }

  await readCsv(serverFilename, importLog)

  addUploadStatus(importLog)

  return importLog
}

module.exports = function () {
  return async function refreshDataUpload (event) {
    const {
      serverFilename,
      clientFilename
    } = event.body.upload

    try {
      return processFile({ serverFilename, clientFilename })
    } catch (err) {
      return {
        uploadGood: '',
        uploadWarning: '',
        uploadError: `Could not process file upload: ${err.message}`
      }
    }
  }
}