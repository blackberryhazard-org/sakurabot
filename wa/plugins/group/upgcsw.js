import { isMimeAudio, randomHex } from '../../lib/Utilities.js'

export default {
   command: 'upgcsw',
   aliases: ['upswgc'],
   category: 'group',
   async run(m, {
      sock,
      text
   }) {
      const q = m.quoted ? m.quoted : m
      const body = text ?? q.body
      const mimetype = (q.msg || q).mimetype

      if (!body && !mimetype)
         return m.reply('💭 Provide text or media you would like to send to the group status.')

      m.react('🕒')
      let content = {}

      if (mimetype) {
         const type = mimetype.split('/')[0]
         content[type] = await q.download()
         if (body) content.caption = body
         if (isMimeAudio(mimetype)) content.ptt = true
         content.groupStatus = true
      } else if (body) {
         content.text = body
         content.groupStatus = true
         content.backgroundColor = randomHex()
      }

      await sock.sendMessage(m.chat, content)
      m.reply('✅ Successfully sent group status.')
   },
   group: true,
   admin: true,
   botAdmin: true
}
