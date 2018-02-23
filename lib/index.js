'use strict'

console.log('loading libraries')
const Slapp = require('./slapp')
const DB = require('./db')
const OAuth = require('./oauth')

module.exports = (server) => {
    console.log('DB init')
  let db = DB()

    console.log('OAuth init')
  OAuth(server, db)
    console.log('Slapp init')
  Slapp(server, db)

  return server
}
