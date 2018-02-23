'use strict'

const App = require('./lib/')
const express = require('express')
const PORT = process.env.PORT || 3000
console.log("Launching bot")

App(express()).listen(PORT, (err) => {
  if (err) {
    return console.error(err)
  }

  console.log('http server started on port %s', PORT)
})
