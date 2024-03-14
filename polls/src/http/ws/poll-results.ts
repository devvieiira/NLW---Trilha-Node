import { FastifyInstance } from "fastify";
import { voting } from "../../utils/vote-pub-sub";
import z from "zod";

export async function pollResults(app: FastifyInstance) {
  app.get('/polls/:pollId/results', { websocket: true }, (connection, request) => {
    connection.socket.on("message", (message: string) => {
      //inscrever apenas nas mensagens publicadas com o ID da enquete("pollId")

      const pollResultsParams = z.object({
        pollId: z.string().uuid(),
      })

      const { pollId } = pollResultsParams.parse(request.params)

      voting.subscribe(pollId, (message) => {
        connection.socket.send(JSON.stringify(message))
      })
    })
  })
}