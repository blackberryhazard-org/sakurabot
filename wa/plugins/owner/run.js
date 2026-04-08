import { exec } from 'child_process'
import { format } from 'util'

export default {
   command: ['run'],
   category: 'owner',
   async run(m, { isPrefix, command, args, text }) {
      if (!args.length) {
         return m.reply(`👉🏻 *Example*:\n${isPrefix + command} code console.log('hello')\n${isPrefix + command} shell ls -la`)
      }

      const type = args[0].toLowerCase()
      const content = text.slice(type.length).trim()

      if (!content) {
         return m.reply(`👉🏻 *Example*:\n${isPrefix + command} code console.log('hello')\n${isPrefix + command} shell ls -la`)
      }

      if (type === 'code') {
         try {
            let evaled = await eval(`(async () => { ${content} })()`)
            if (typeof evaled !== 'string') evaled = format(evaled)
            m.reply(`*RESULT*\n\n\`\`\`${evaled}\`\`\``)
         } catch (e) {
            m.reply(`*ERROR*\n\n\`\`\`${format(e)}\`\`\``)
         }
      } else if (type === 'shell') {
         exec(content, (err, stdout, stderr) => {
            if (err) return m.reply(`*ERROR*\n\n\`\`\`${format(err)}\`\`\``)
            if (stderr) return m.reply(`*STDERR*\n\n\`\`\`${stderr}\`\`\``)
            m.reply(`*STDOUT*\n\n\`\`\`${stdout}\`\`\``)
         })
      } else {
         m.reply(`👉🏻 *Example*:\n${isPrefix + command} code console.log('hello')\n${isPrefix + command} shell ls -la`)
      }
   },
   owner: true
}
