import { exec } from 'child_process'
import { format } from 'util'

export default {
   command: ['run'],
   category: 'owner',
   async run(m, { isPrefix, command, text }) {
      const trimmed = text.trimStart()
      const firstSpace = trimmed.indexOf(' ')

      if (firstSpace === -1) {
         return m.reply(`👉🏻 *Example*:\n${isPrefix + command} code console.log('hello')\n${isPrefix + command} shell ls -la\n${isPrefix + command} script foo/bar.js`)
      }

      const type = trimmed.slice(0, firstSpace).toLowerCase()
      const content = trimmed.slice(firstSpace + 1).trimStart()

      if (!content) {
         return m.reply(`👉🏻 *Example*:\n${isPrefix + command} code console.log('hello')\n${isPrefix + command} shell ls -la\n${isPrefix + command} script foo/bar.js`)
      }

      if (type === 'code') {
         try {
            let codeToEval = content
            if (!content.includes('return') && !content.includes('await')) {
               codeToEval = `return ${content}`
            }
            let evaled = await eval(`(async () => { ${codeToEval} })()`)
            if (typeof evaled !== 'string') evaled = format(evaled)
            m.reply(`*RESULT*\n\n\`\`\`${evaled}\`\`\``)
         } catch (e) {
            try {
               let evaled = await eval(`(async () => { ${content} })()`)
               if (typeof evaled !== 'string') evaled = format(evaled)
               m.reply(`*RESULT*\n\n\`\`\`${evaled}\`\`\``)
            } catch (err) {
               m.reply(`*ERROR*\n\n\`\`\`${format(err)}\`\`\``)
            }
         }
      } else if (type === 'shell') {
         exec(content, { timeout: 30000, maxBuffer: 5 * 1024 * 1024 }, (err, stdout, stderr) => {
            if (err) return m.reply(`*ERROR*\n\n\`\`\`${format(err)}\`\`\``)
            if (stderr) return m.reply(`*STDERR*\n\n\`\`\`${stderr}\`\`\``)
            m.reply(`*STDOUT*\n\n\`\`\`${stdout}\`\`\``)
         })
      } else if (type === 'script') {
         exec(`node ${content}`, { timeout: 60000, maxBuffer: 5 * 1024 * 1024 }, (err, stdout, stderr) => {
            if (err) return m.reply(`*ERROR*\n\n\`\`\`${format(err)}\`\`\``)
            if (stderr) return m.reply(`*STDERR*\n\n\`\`\`${stderr}\`\`\``)
            m.reply(`*STDOUT*\n\n\`\`\`${stdout}\`\`\``)
         })
      } else {
         m.reply(`👉🏻 *Example*:\n${isPrefix + command} code console.log('hello')\n${isPrefix + command} shell ls -la\n${isPrefix + command} script foo/bar.js`)
      }
   },
   owner: true
}
