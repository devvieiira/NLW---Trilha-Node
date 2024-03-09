import z from "zod"
import { randomUUID } from "node:crypto"
import { FastifyInstance } from "fastify"
import { prisma } from "../../lib/prisma"

export async function voteOnPoll(app: FastifyInstance) {
  app.post('/polls/:pollId/votes', async (request, reply) => {
    const voteOnPollBody = z.object({
      pollOptionId: z.string().uuid()
    })

    const voteOnPollParams = z.object({
      pollId: z.string().uuid(),
    })

    const { pollOptionId } = voteOnPollBody.parse(request.body)

    const { pollId } = voteOnPollParams.parse(request.params)

    let userId = request.cookies.userId

    if (userId) {
      const userPreviewsVote = await prisma.vote.findUnique({
        where: {
          userId_pollId: {
            userId,
            pollId
          }
        }
      })

      if (userPreviewsVote && userPreviewsVote.pollOptionId !== pollOptionId) {
        await prisma.vote.delete({
          where: {
            id: userPreviewsVote.id
          }
        })
      } else if (userPreviewsVote) {
        return reply.status(400).send({ message: "You already voted on this poll." })
      }
    }

    if (!userId) {
      userId = randomUUID()
      reply.setCookie("userId", userId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        signed: true,
        httpOnly: true,
      })

    }

    await prisma.vote.create({
      data: {
        userId,
        pollId,
        pollOptionId
      }
    })


    return reply.status(201).send({ userId })
  })
}