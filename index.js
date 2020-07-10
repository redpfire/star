'use strict';

const {Client, MessageEmbed, Message} = require('discord.js');
const client = new Client();
const config = require('./config.json');
const locale = require('./locale.json');

class MessageWrapper {
    constructor(orig, my) {
        this.orig = orig;
        this.my = my;
    }

    is_id(id) {
        return this.orig.id === id;
    }
}

let msgs = [];

client.on('ready', () => {
    console.log('Ready');
});

client.on('message', msg => {
    const isOwner = config.owners.findIndex(i => i === msg.author.id) > -1;
    if (!isOwner) return;

    const rewriteConfig = () => {
        require('fs').writeFile('config.json', JSON.stringify(config, null, 2), err => console.err);
    };

    const args = msg.content.split(' ');
    const guildCfg = config.guilds.find(g => g.guildId === msg.guild.id);

    switch (args[0]) {
        case config.prompt+'setchannel':
            const channelId = args[1];

            let g = guildCfg !== undefined ? guildCfg : {};

            if (guildCfg !== undefined) {
                const index = config.guilds.findIndex(g => g.guildId === msg.guild.id);
                config.guilds.splice(index, 1);
            }
            else {
                g.guildId = msg.guild.id;
                g.lang = config.defaultLang;
            }

            g.channelId = channelId;

            config.guilds.push(g);

            rewriteConfig();

            msg.channel.send(locale.channelSet[g.lang]);
            break;

        case config.prompt+'setnsfw':
            const nsfwId = args[1];
            if (guildCfg === undefined) {
                msg.channel.send(locale.needGuildCfg);
                return;
            }

            guildCfg.nsfwId = nsfwId;
            rewriteConfig();

            msg.channel.send(locale.nsfwSet[guildCfg.lang]);
            break;

        case config.prompt+'setlang':
            const lang = args[1].toLowerCase();
            if (locale.langs.findIndex(l => l === lang) == -1) return;
            if (guildCfg === undefined) {
                msg.channel.send(locale.needGuildCfg);
                return;
            }
            
            guildCfg.lang = lang;
            rewriteConfig();

            msg.channel.send(locale.langSet[guildCfg.lang]);
            break;

        case config.prompt+'help':
            const _lang = guildCfg === undefined ? 'en' : guildCfg.lang;

            msg.channel.send(locale.help[_lang]);
            break;
    }
});

client.on('messageReactionAdd', r => {
    if (r.emoji.name !== '⭐') return;

    if (r.count < config.threshold) return;
    const guildCfg = config.guilds.find(g => g.guildId === r.message.guild.id);
    const _lang = guildCfg !== undefined ? guildCfg.lang : 'en';

    const msg = msgs.find(k => k.is_id(r.message.id));
    const url = '[Jump!]('+r.message.url+')';
    const content = r.message.content ? r.message.content : ' ';
    const attachments = r.message.attachments.array();
    const embed = new MessageEmbed()
        .addField(locale.content[_lang], content)
        .addField(locale.author[_lang], r.message.author, true)
        .addField(locale.channel[_lang], r.message.channel, true)
        .addField(locale.source[_lang], url, true)
        .setFooter('⭐ '+r.count+' '+locale.stars[_lang])
        .setColor(0xfaa61a)
        .setTimestamp();

    if (msg === undefined) {
        const guildCfg = config.guilds.find(g => g.guildId === r.message.guild.id);
        if (guildCfg === undefined) return;

        if (!r.message.channel.nsfw) {
            r.message.guild.channels.resolve(guildCfg.channelId)
                .send(embed, attachments)
                .then(m => {
                    msgs.push(new MessageWrapper(r.message, m));
                });
        }
        else {
            if (guildCfg.nsfwId === undefined) return;

            r.message.guild.channels.resolve(guildCfg.nsfwId)
                .send(embed, attachments)
                .then(m => {
                    msgs.push(new MessageWrapper(r.message, m));
                });
        }
    }
    else {
        msg.my.edit(embed);
    }
});

client.on('messageReactionRemove', r => {
    if (r.emoji.name !== '⭐') return;

    const msg = msgs.find(k => k.is_id(r.message.id));
    if (msg === undefined) return;

    const guildCfg = config.guilds.find(g => g.guildId === r.message.guild.id);
    const _lang = guildCfg !== undefined ? guildCfg.lang : 'en';
    const content = r.message.content ? r.message.content : ' ';

    if (r.count > 0 && r.count >= config.threshold) {
        const url = '[Jump!]('+r.message.url+')';
        const embed = new MessageEmbed()
            .addField(locale.content[_lang], content)
            .addField(locale.author[_lang], r.message.author, true)
            .addField(locale.channel[_lang], r.message.channel, true)
            .addField(locale.source[_lang], url, true)
            .setFooter('⭐ '+r.count+' '+locale.stars[_lang])
            .setColor(0xfaa61a)
            .setTimestamp();

        msg.my.edit(embed);
    }
    else {
        const msgIndex = msgs.findIndex(k => k.is_id(r.message.id));

        msg.my.delete();
        msgs.splice(msgIndex, 1);
    }
});

client.login(config.token);
