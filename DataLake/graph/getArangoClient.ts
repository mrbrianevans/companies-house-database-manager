import arangojs from "arangojs";

export function getArangoClient() {
  return arangojs({
    url: 'http://arango:8529',
    databaseName: 'companyData',
    auth: {username: 'root', password: process.env.ARANGO_ROOT_PASSWORD}
  })
}