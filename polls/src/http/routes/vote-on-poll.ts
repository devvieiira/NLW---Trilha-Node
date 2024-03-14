import z from "zod"
import { randomUUID } from "node:crypto"
import { FastifyInstance } from "fastify"
import { prisma } from "../../lib/prisma"
import { redis } from "../../lib/redis"
import { voting } from "../../utils/vote-pub-sub"

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

        await redis.zincrby(pollId, -1, userPreviewsVote.pollOptionId)

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

    const votes = await redis.zincrby(pollId, 1, pollOptionId)

    voting.publish(pollId, {
      pollOptionId,
      votes: Number(votes),
    })

    return reply.status(201).send({ userId })
  })
}