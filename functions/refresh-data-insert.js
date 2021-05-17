module.exports = function () {
  return async function refreshDataInsert (event, env) {
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
      startTime,
      totalRows,
      totalRejected
    } = event

    const importLog = {
      serverFilename,
      clientFilename,
      startTime,
      totalRows,
      totalRejected
    }

    const statements = ['TRUNCATE TABLE ofsted.ofsted;']

    for (const { urn, uprn, establishmentName, ofstedRating } of rows) {
      statements.push(`INSERT INTO ofsted.ofsted (urn, uprn, establishment_name, ofsted_rating) VALUES (${urn}, '${uprn.replace(/'/g, "''")}', '${establishmentName.replace(/'/g, "''")}', '${ofstedRating.replace(/'/g, "''")}');`)
    }

    await client.run(statements.map(sql => { return { sql } }))
    await logModel.create(importLog)

    return event
  }
}
