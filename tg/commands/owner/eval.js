const { exec } = require('child_process');

module.exports = {
    name: 'eval',
    category: 'owner',
    description: 'Execute a shell command (owner only).',
    code: async (ctx, { isOwner, config }) => {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply(config.msg.owner);
        }

        const command = ctx.message.text.split(' ').slice(1).join(' ');
        if (!command) {
            return ctx.reply('Please provide a command to execute.');
        }

        exec(command, (error, stdout, stderr) => {
            if (error) {
                return ctx.reply(`Error: ${error.message}`);
            }
            if (stderr) {
                return ctx.reply(`Stderr: ${stderr}`);
            }
            ctx.reply(`Output:\n${stdout}`);
        });
    }
};
