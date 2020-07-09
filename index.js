'use strict';

const {Client, MessageEmbed, Message} = require('discord.js');
const client = new Client();
const config = require('./config.json');

class MyMessage {
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
    if (isOwner) {
        if (msg.content.startsWith('-setchannel')) {
            const channelId = msg.content.split(' ')[1];
            const cfgInfo = config.guilds.findIndex(g => g.guildId === msg.guild.id);

            if (cfgInfo !== -1) {
                config.guilds.splice(cfgInfo, 1);
            }

            let g = {};
            g.guildId = msg.guild.id;
            g.channelId = channelId;

            config.guilds.push(g);

            require('fs').writeFile('config.json', JSON.stringify(config, null, 2), err => console.log);

            msg.channel.send(':ok_hand:');
        }
    }
});

client.on('messageReactionAdd', r => {
    const msg = msgs.find(k => k.is_id(r.message.id));
    const url = '[Jump!]('+r.message.url+')';
    const embed = new MessageEmbed()
        .addField('Content', r.message.content)
        .addField('Author', r.message.author.toString(), true)
        .addField('Channel', r.message.channel.toString(), true)
        .addField('Source', url, true)
        .setFooter('⭐ '+r.count+' stars')
        .setColor(0xfaa61a)
        .setTimestamp();

    if (msg === undefined) {
        if (r.count >= config.threshold) {
            const cfgInfo = config.guilds.find(g => g.guildId === r.message.guild.id);
            if (cfgInfo !== undefined) {
                r.message.guild.channels.resolve(cfgInfo.channelId).send(embed).then(m => {msgs.push(new MyMessage(r.message, m))});
            }
        }
    }
    else {
        msg.my.edit(embed);
    }
});

client.on('messageReactionRemove', r => {
    const msg = msgs.find(k => k.is_id(r.message.id));
    const msgIndex = msgs.findIndex(k => k.is_id(r.message.id));

    if (r.count > 0 && r.count >= config.threshold) {
        const url = '[Jump!]('+r.message.url+')';
        const embed = new MessageEmbed()
            .addField('Content', r.message.content)
            .addField('Author', r.message.author.toString(), true)
            .addField('Channel', r.message.channel.toString(), true)
            .addField('Source', url, true)
            .setFooter('⭐ '+r.count+' stars')
            .setColor(0xfaa61a)
            .setTimestamp();

        if (msg !== undefined) {
            msg.my.edit(embed);
        }
    }
    else {
        if (msg !== undefined) {
            msg.my.delete();
            msgs.splice(msgIndex, 1);
        }
    }
});

client.login(config.token);
