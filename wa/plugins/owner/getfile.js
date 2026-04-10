import fs from 'fs'
import path from 'path'

export default {
   command: ['getfile'],
   category: 'owner',
   async run(m, { isPrefix, command, text, sock }) {
      if (!text) {
         return m.reply(`👉🏻 *Example*:\n${isPrefix + command} package.json`)
      }

      const repoRoot = path.resolve(process.cwd(), '..')
      const filePath = path.resolve(repoRoot, text.trim())

      try {
         const stat = fs.statSync(filePath)
         if (stat.isDirectory()) {
            return m.reply(`❌ Target is a directory: ${text.trim()}`)
         }
      } catch (err) {
         if (err.code === 'ENOENT') {
            return m.reply(`❌ File not found: ${text.trim()}`)
         }
         return m.reply(`❌ Failed to read file status: ${err.message}`)
      }

      try {
         await sock.sendMessage(m.chat, {
            document: { url: filePath },
            mimetype: 'application/octet-stream',
            fileName: path.basename(filePath)
         }, { quoted: m })
      } catch (error) {
         m.reply(`❌ Failed to send file: ${error.message}`)
      }
   },
   owner: true
}
