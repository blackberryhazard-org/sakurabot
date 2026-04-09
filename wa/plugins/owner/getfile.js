import fs from 'fs'
import path from 'path'

export default {
   command: ['getfile'],
   category: 'owner',
   async run(m, { isPrefix, command, text, sock }) {
      if (!text) {
         return m.reply(`👉🏻 *Example*:\n${isPrefix + command} package.json`)
      }

      const filePath = path.resolve(text.trim())

      if (!fs.existsSync(filePath)) {
         return m.reply(`❌ File not found: ${text.trim()}`)
      }

      if (fs.statSync(filePath).isDirectory()) {
         return m.reply(`❌ Target is a directory: ${text.trim()}`)
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
