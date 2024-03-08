import fastify from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { createPoll } from './routes/create-poll'
import { getPoll } from './routes/get-poll'

const app = fastify()

app.register(createPoll)

app.register(getPoll)

app.listen({ port: 3333 }).then(() => {
  console.log('HTTP server running!')
})

