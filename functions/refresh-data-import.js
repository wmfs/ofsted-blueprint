const cloneDeep = require('lodash.clonedeep')
const dottie = require('dottie')

module.exports = function () {
  return async function refreshDataImport (event, env, context) {
    const {
      models,
      client
    } = env.bootedServices.storage

    const {
      ofsted_importLog: logModel
    } = models

    const {
      rows,
      serverFilename,
      clientFilename,
      totalRows,
      totalRejected
    } = event

    const importLog = {
      serverFilename,
      clientFilename,
      totalRows,
      totalRejected,
      startTime: new Date(),
      totalRowsInserted: 0,
      progress: 0,
      complete: false
    }

    const importLogDoc = await logModel.create(importLog)
    importLog.id = importLogDoc.idProperties.id

    await client.query('TRUNCATE TABLE ofsted.ofsted;')

    for (const { urn, uprn, establishmentName, ofstedRating } of rows) {
      await client.query(`INSERT INTO ofsted.ofsted (urn, uprn, establishment_name, ofsted_rating) VALUES (${urn}, '${uprn.replace(/'/g, "''")}', '${establishmentName.replace(/'/g, "''")}', '${ofstedRating.replace(/'/g, "''")}');`)

      importLog.totalRowsInserted++

      // report every 250 rows
      const c = importLog.totalRowsInserted
      if (Math.trunc(c / 250) === (c / 250) && c < importLog.totalRows) {
        await progress(importLog, false, event, env, context)
        await logModel.update(importLog, {})
      }
    }

    importLog.endTime = new Date()

    await progress(importLog, true, event, env, context)
    await logModel.update(importLog, {})

    return event
  }
}

async function progress (importLog, complete, event, env, context) {
  let parentExecutionName, parentResultPath

  if (event.launcher) {
    parentExecutionName = event.launcher.executionName
    parentResultPath = event.launcher.callbackPath
  }

  if (parentExecutionName) {
    importLog.complete = complete
    importLog.progress = importLog.totalRowsInserted / importLog.totalRows
    const { statebox } = env.bootedServices
    const executionOptions = cloneDeep(context.executionOptions)
    const updateEvent = complete ? 'sendTaskLastHeartbeat' : 'sendTaskHeartbeat'
    const shaped = {}
    dottie.set(shaped, parentResultPath, importLog)

    try {
      await statebox[updateEvent](parentExecutionName, shaped, executionOptions)
    } catch (err) {
      console.log('Error progressing', err)
      // ignore failures, but don't let them
      // propagate so we don't bring down the
      // whole state machine
    }
  }
}
