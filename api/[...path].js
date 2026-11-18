/**
 * Vercel Serverless Function — captura todas as rotas /api/* e repassa
 * para o mesmo app Express usado localmente (server/app.js).
 *
 * Não é necessário reescrever /api no vercel.json: o arquivo catch-all
 * já recebe o caminho original (ex.: /api/admin/users).
 */
import app from '../server/app.js'

export default app
