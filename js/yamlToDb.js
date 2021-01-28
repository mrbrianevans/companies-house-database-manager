const uploadYamlToDb = async (filename, db_table, array_title) => {
  
  const yaml = require('js-yaml')
  const fs = require('fs')
  const path = require('path')
  const {Client} = require("pg");
  const client = new Client({
    ssl: {
      rejectUnauthorized: false,
      require: true
    }
  });
  try {
    await client.connect()
    console.log("Connected to DB")
    client.on("error", console.log);
    const file = fs.readFileSync(path.resolve(__dirname, '../api-enumerations/', filename))
    const doc = yaml.load(file)
    for (const key in doc[array_title]) {
      await client.query(`INSERT INTO ${db_table} (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`, [key, doc[array_title][key]])
      process.stdout.write('.')
    }
    console.log()
    await client.end()
  } catch (e) {
    await client.end()
    console.error(e)
  } finally {
    console.log("Finished")
  }
}


uploadYamlToDb('filing-history-descriptions.yaml', 'filing_history_descriptions', 'description')
