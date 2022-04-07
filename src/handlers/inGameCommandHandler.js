const Timer = require('../util/timer');
const Str = require('../util/string.js');
const DiscordTools = require('../discordTools/discordTools.js');
const Map = require('../util/map.js');
const Constants = require('../util/constants.js');

module.exports = {
    inGameCommandHandler: async function (rustplus, client, message) {
        let command = message.broadcast.teamMessage.message.message;

        if (!rustplus.generalSettings.inGameCommandsEnabled) {
            return false;
        }
        else if (command === `${rustplus.generalSettings.prefix}afk`) {
            module.exports.commandAfk(rustplus);
        }
        else if (command === `${rustplus.generalSettings.prefix}alive`) {
            module.exports.commandAlive(rustplus);
        }
        else if (command === `${rustplus.generalSettings.prefix}bradley`) {
            module.exports.commandBradley(rustplus);
        }
        else if (command === `${rustplus.generalSettings.prefix}cargo`) {
            module.exports.commandCargo(rustplus);
        }
        else if (command === `${rustplus.generalSettings.prefix}chinook`) {
            module.exports.commandChinook(rustplus);
        }
        else if (command === `${rustplus.generalSettings.prefix}crate`) {
            module.exports.commandCrate(rustplus);
        }
        else if (command === `${rustplus.generalSettings.prefix}heli`) {
            module.exports.commandHeli(rustplus);
        }
        else if (command === `${rustplus.generalSettings.prefix}large`) {
            module.exports.commandLarge(rustplus);
        }
        else if (command.startsWith(`${rustplus.generalSettings.prefix}leader`)) {
            module.exports.commandLeader(rustplus, message);
        }
        else if (command.startsWith(`${rustplus.generalSettings.prefix}marker`)) {
            module.exports.commandMarker(rustplus, client, message);
        }
        else if (command === `${rustplus.generalSettings.prefix}mute`) {
            module.exports.commandMute(rustplus, client);
        }
        else if (command === `${rustplus.generalSettings.prefix}offline`) {
            module.exports.commandOffline(rustplus);
        }
        else if (command === `${rustplus.generalSettings.prefix}online`) {
            module.exports.commandOnline(rustplus);
        }
        else if (command === `${rustplus.generalSettings.prefix}pop`) {
            module.exports.commandPop(rustplus);
        }
        else if (command === `${rustplus.generalSettings.prefix}small`) {
            module.exports.commandSmall(rustplus);
        }
        else if (command === `${rustplus.generalSettings.prefix}time`) {
            module.exports.commandTime(rustplus);
        }
        else if (command.startsWith(`${rustplus.generalSettings.prefix}timer `)) {
            module.exports.commandTimer(rustplus, command);
        }
        else if (command === `${rustplus.generalSettings.prefix}unmute`) {
            module.exports.commandUnmute(rustplus, client);
        }
        else if (command === `${rustplus.generalSettings.prefix}wipe`) {
            module.exports.commandWipe(rustplus);
        }
        else {
            /* Maybe a custom command? */
            let instance = client.readInstanceFile(rustplus.guildId);

            for (const [id, content] of Object.entries(instance.switches)) {
                let cmd = `${rustplus.generalSettings.prefix}${content.command}`;
                if (command.startsWith(cmd)) {
                    let active;
                    if (command === cmd) {
                        active = !content.active;
                    }
                    else if (command === `${cmd} on`) {
                        if (!content.active) {
                            active = true;
                        }
                        else {
                            return true;
                        }
                    }
                    else if (command === `${cmd} off`) {
                        if (content.active) {
                            active = false;
                        }
                        else {
                            return true;
                        }
                    }
                    else {
                        return false;
                    }

                    instance.switches[id].active = active;
                    client.writeInstanceFile(rustplus.guildId, instance);

                    rustplus.turnSmartSwitchAsync(id, active);
                    DiscordTools.sendSmartSwitchMessage(rustplus.guildId, id, true, true, false);
                    let str = `${instance.switches[id].name} was turned `;
                    str += (active) ? 'on.' : 'off.';
                    rustplus.sendTeamMessageAsync(str);

                    rustplus.interactionSwitches[id] = active;

                    return true;
                }
            }
            return false;
        }

        return true;
    },

    commandAfk: function (rustplus) {
        let str = '';

        for (let player of rustplus.team.players) {
            if (player.isOnline) {
                if (player.getAfkSeconds() >= Constants.AFK_TIME_SECONDS) {
                    str += `${player.name} [${player.getAfkTime('dhs')}], `;
                }
            }
        }

        str = (str !== '') ? str.slice(0, -2) : 'No one is AFK.';
        rustplus.printCommandOutput(str);
    },

    commandAlive: function (rustplus) {
        let player = rustplus.team.getPlayerLongestAlive();
        let time = player.getAliveTime();
        rustplus.printCommandOutput(`${player.name} has been alive the longest (${time})`);
    },

    commandBradley: function (rustplus) {
        let strings = [];

        let timerCounter = 0;
        for (const [id, timer] of Object.entries(rustplus.bradleyRespawnTimers)) {
            timerCounter += 1;
            let time = Timer.getTimeLeftOfTimer(timer);

            if (time !== null) {
                strings.push(`Approximately ${time} before Bradley APC respawns.`);
            }
        }

        if (timerCounter === 0) {
            if (rustplus.timeSinceBradleyWasDestroyed === null) {
                strings.push('Bradley APC is probably roaming around at Launch Site.');
            }
            else {
                let secondsSince = (new Date() - rustplus.timeSinceBradleyWasDestroyed) / 1000;
                let timeSince = Timer.secondsToFullScale(secondsSince);
                strings.push(`It was ${timeSince} since Bradley APC got destroyed.`)
            }
        }

        for (let str of strings) {
            rustplus.printCommandOutput(str);
        }
    },

    commandCargo: function (rustplus) {
        let strings = [];
        let unhandled = Object.keys(rustplus.activeCargoShips);
        let numOfShips = unhandled.length;

        for (const [id, timer] of Object.entries(rustplus.cargoShipEgressTimers)) {
            unhandled = unhandled.filter(e => e != parseInt(id));
            let time = Timer.getTimeLeftOfTimer(timer);
            let pos = rustplus.activeCargoShips[parseInt(id)].location;

            if (time !== null) {
                strings.push(`Approximately ${time} before Cargo Ship at ${pos} enters egress stage.`);
            }
        }

        if (unhandled.length > 0) {
            for (let cargoShip of unhandled) {
                let pos = rustplus.activeCargoShips[cargoShip].location;
                strings.push(`Cargo Ship is located at ${pos}.`);
            }
        }

        if (numOfShips === 0) {
            if (rustplus.timeSinceCargoWasOut === null) {
                strings.push('Cargo Ship is currently not on the map.');
            }
            else {
                let secondsSince = (new Date() - rustplus.timeSinceCargoWasOut) / 1000;
                let timeSince = Timer.secondsToFullScale(secondsSince);
                strings.push(`It was ${timeSince} since Cargo Ship left.`)
            }
        }

        for (let str of strings) {
            rustplus.printCommandOutput(str);
        }
    },

    commandChinook: function (rustplus) {
        let strings = [];

        let chinookCounter = 0;
        for (const [id, content] of Object.entries(rustplus.activeChinook47s)) {
            if (content.type === 'crate') {
                chinookCounter += 1;
                strings.push(`Chinook 47 is located at ${content.location}`);
            }
        }

        if (chinookCounter === 0) {
            if (rustplus.timeSinceChinookWasOut === null) {
                strings.push('No current data on Chinook 47.');
            }
            else {
                let secondsSince = (new Date() - rustplus.timeSinceChinookWasOut) / 1000;
                let timeSince = Timer.secondsToFullScale(secondsSince);
                strings.push(`It was ${timeSince} since the last Chinook 47 was on the map.`);
            }
        }

        for (let str of strings) {
            rustplus.printCommandOutput(str);
        }
    },

    commandCrate: function (rustplus) {
        let strings = [];

        for (const [id, timer] of Object.entries(rustplus.lockedCrateDespawnTimers)) {
            let time = Timer.getTimeLeftOfTimer(timer);
            let pos = rustplus.activeLockedCrates[parseInt(id)].type;

            if (time !== null) {
                strings.push(`Approximately ${time} before Locked Crate at ${pos} despawns.`);
            }
        }

        if (strings.length === 0) {
            if (rustplus.timeSinceChinookDroppedCrate === null) {
                strings.push('No current data on Chinook 47 Locked Crate.');
            }
            else {
                let secondsSince = (new Date() - rustplus.timeSinceChinookDroppedCrate) / 1000;
                let timeSince = Timer.secondsToFullScale(secondsSince);
                strings.push(`It was ${timeSince} since the last Chinook 47 Locked Crate was dropped.`);
            }
        }

        for (let str of strings) {
            rustplus.printCommandOutput(str);
        }
    },

    commandHeli: function (rustplus) {
        let strings = [];

        let heliCounter = 0;
        for (const [id, content] of Object.entries(rustplus.activePatrolHelicopters)) {
            heliCounter += 1;
            strings.push(`Patrol Helicopter is located at ${content.location}.`);
        }

        if (heliCounter === 0) {
            if (rustplus.timeSinceHeliWasOnMap === null &&
                rustplus.timeSinceHeliWasDestroyed === null) {
                strings.push('No current data on Patrol Helicopter.');
            }
            else if (rustplus.timeSinceHeliWasOnMap !== null &&
                rustplus.timeSinceHeliWasDestroyed === null) {
                let secondsSince = (new Date() - rustplus.timeSinceHeliWasOnMap) / 1000;
                let timeSince = Timer.secondsToFullScale(secondsSince);
                strings.push(`It was ${timeSince} since the last Patrol Helicopter was on the map.`);
            }
            else if (rustplus.timeSinceHeliWasOnMap !== null &&
                rustplus.timeSinceHeliWasDestroyed !== null) {
                let secondsSince = (new Date() - rustplus.timeSinceHeliWasOnMap) / 1000;
                let timeSinceOut = Timer.secondsToFullScale(secondsSince);
                secondsSince = (new Date() - rustplus.timeSinceHeliWasDestroyed) / 1000;
                let timeSinceDestroyed = Timer.secondsToFullScale(secondsSince);
                strings.push(`It was ${timeSinceOut} since Patrol Helicopter was on the map and ` +
                    `${timeSinceDestroyed} since it got downed.`);
            }
        }

        for (let str of strings) {
            rustplus.printCommandOutput(str);
        }
    },

    commandLarge: function (rustplus) {
        let strings = [];

        let timerCounter = 0;
        for (const [id, timer] of Object.entries(rustplus.lockedCrateLargeOilRigTimers)) {
            timerCounter += 1;
            let time = Timer.getTimeLeftOfTimer(timer);
            let pos = rustplus.activeLockedCrates[parseInt(id)].location;

            if (time !== null) {
                strings.push(`Approximately ${time} before Locked Crate unlocks at Large Oil Rig at ${pos}.`);
            }
        }

        if (timerCounter === 0) {
            if (rustplus.timeSinceLargeOilRigWasTriggered === null) {
                strings.push('No current data on Large Oil Rig.');
            }
            else {
                let secondsSince = (new Date() - rustplus.timeSinceLargeOilRigWasTriggered) / 1000;
                let timeSince = Timer.secondsToFullScale(secondsSince);
                strings.push(`It was ${timeSince} since Large Oil Rig last got triggered.`);
            }
        }

        for (let str of strings) {
            rustplus.printCommandOutput(str);
        }
    },

    commandLeader: async function (rustplus, message) {
        let command = message.broadcast.teamMessage.message.message;
        let callerId = message.broadcast.teamMessage.message.steamId.toString();

        if (command === `${rustplus.generalSettings.prefix}leader`) {
            await rustplus.team.changeLeadership(callerId);
        }
        else {
            let name = command.replace(`${rustplus.generalSettings.prefix}leader `, '');

            /* Look if the value provided is a steamId */
            for (let player of rustplus.team.players) {
                if (name === player.steamId) {
                    await rustplus.team.changeLeadership(player.steamId);
                    return;
                }
            }

            /* Look for parts of the name */
            for (let player of rustplus.team.players) {
                if (player.name.toLowerCase().includes(name.toLowerCase())) {
                    await rustplus.team.changeLeadership(player.steamId);
                    return;
                }
            }

            /* Find the closest name */
            for (let player of rustplus.team.players) {
                if (Str.similarity(name, player.name) >= 0.9) {
                    await rustplus.team.changeLeadership(player.steamId);
                    return;
                }
            }
        }
    },

    commandMarker: async function (rustplus, client, message) {
        let callerId = message.broadcast.teamMessage.message.steamId.toString();
        let command = message.broadcast.teamMessage.message.message;
        let serverId = `${rustplus.server}-${rustplus.port}`;

        if (!command.startsWith(`${rustplus.generalSettings.prefix}marker `)) {
            return;
        }

        command = command.replace(`${rustplus.generalSettings.prefix}marker `, '');
        let subcommand = command.replace(/ .*/, '');
        command = command.slice(subcommand.length + 1);

        switch (subcommand) {
            case 'add': {
                let teamInfo = await rustplus.getTeamInfoAsync();
                if (teamInfo.error) return;

                let instance = client.readInstanceFile(rustplus.guildId);

                let callerLocation = null;
                for (let player of teamInfo.teamInfo.members) {
                    if (player.steamId.toString() === callerId) {
                        callerLocation = { x: player.x, y: player.y };
                        break;
                    }
                }

                instance.markers[serverId][command] = callerLocation;
                client.writeInstanceFile(rustplus.guildId, instance);
                rustplus.markers[command] = callerLocation;

                let str = `Marker '${command}' was added.`;
                rustplus.printCommandOutput(str);
            } break;

            case 'remove': {
                let instance = client.readInstanceFile(rustplus.guildId);

                if (command in rustplus.markers) {
                    delete rustplus.markers[command];
                    delete instance.markers[serverId][command];
                    client.writeInstanceFile(rustplus.guildId, instance);

                    let str = `Marker '${command}' was removed.`;
                    rustplus.printCommandOutput(str);
                }
            } break;

            case 'list': {
                let str = '';
                for (const [name, location] of Object.entries(rustplus.markers)) {
                    str += `${name}, `;
                }

                if (str !== '') {
                    str = str.slice(0, -2);
                }
                else {
                    str = 'No markers.';
                }

                rustplus.printCommandOutput(str);
            } break;

            default: {
                if (!(subcommand in rustplus.markers)) {
                    return;
                }

                let teamInfo = await rustplus.getTeamInfoAsync();
                if (teamInfo.error) return;

                let callerLocation = null;
                let callerName = null;
                for (let player of teamInfo.teamInfo.members) {
                    if (player.steamId.toString() === callerId) {
                        callerLocation = { x: player.x, y: player.y };
                        callerName = player.name;
                        break;
                    }
                }

                let direction = Map.getAngleBetweenPoints(
                    callerLocation.x, callerLocation.y,
                    rustplus.markers[subcommand].x, rustplus.markers[subcommand].y);
                let distance = Math.floor(Map.getDistance(
                    callerLocation.x, callerLocation.y,
                    rustplus.markers[subcommand].x, rustplus.markers[subcommand].y));

                let str = `Marker '${subcommand}' is ${distance}m from ${callerName} in direction ${direction}°.`;
                rustplus.printCommandOutput(str);
            } break;
        }
    },

    commandMute: function (rustplus, client) {
        let str = `In-Game bot messages muted.`;
        rustplus.printCommandOutput(str);

        let instance = client.readInstanceFile(rustplus.guildId);
        rustplus.generalSettings.muteInGameBotMessages = true;
        instance.generalSettings.muteInGameBotMessages = true;
        client.writeInstanceFile(rustplus.guildId, instance);
    },

    commandOffline: function (rustplus) {
        let str = '';
        for (let player of rustplus.team.players) {
            if (!player.isOnline) {
                str += `${player.name}, `;
            }
        }

        str = (str !== '') ? str.slice(0, -2) : 'No one is offline.';
        rustplus.printCommandOutput(str);
    },

    commandOnline: function (rustplus) {
        let str = '';
        for (let player of rustplus.team.players) {
            if (player.isOnline) {
                str += `${player.name}, `;
            }
        }

        str = str.slice(0, -2);
        rustplus.printCommandOutput(str);
    },

    commandPop: function (rustplus) {
        let str = `Population: (${rustplus.info.players}/${rustplus.info.maxPlayers}) players`;
        if (rustplus.info.queuedPlayers !== 0) {
            str += ` and ${rustplus.info.queuedPlayers} players in queue.`;
        }
        rustplus.printCommandOutput(str);
    },

    commandSmall: function (rustplus) {
        let strings = [];

        let timerCounter = 0;
        for (const [id, timer] of Object.entries(rustplus.lockedCrateSmallOilRigTimers)) {
            timerCounter += 1;
            let time = Timer.getTimeLeftOfTimer(timer);
            let pos = rustplus.activeLockedCrates[parseInt(id)].location;

            if (time !== null) {
                strings.push(`Approximately ${time} before Locked Crate unlocks at Small Oil Rig at ${pos}.`);
            }
        }

        if (timerCounter === 0) {
            if (rustplus.timeSinceSmallOilRigWasTriggered === null) {
                strings.push('No current data on Small Oil Rig.');
            }
            else {
                let secondsSince = (new Date() - rustplus.timeSinceSmallOilRigWasTriggered) / 1000;
                let timeSince = Timer.secondsToFullScale(secondsSince);
                strings.push(`It was ${timeSince} since Small Oil Rig last got triggered.`);
            }
        }

        for (let str of strings) {
            rustplus.printCommandOutput(str);
        }
    },

    commandTime: function (rustplus) {
        let time = Timer.convertDecimalToHoursMinutes(rustplus.time.time);
        let str = `In-Game time: ${time}.`;
        let timeLeft = rustplus.time.getTimeTillDayOrNight();

        if (timeLeft !== null) {
            if (rustplus.time.isDay()) {
                str += ` Approximately ${timeLeft} before nightfall.`;
            }
            else {
                str += ` Approximately ${timeLeft} before daybreak.`;
            }
        }

        rustplus.printCommandOutput(str);
    },

    commandTimer: function (rustplus, command) {
        if (!command.startsWith(`${rustplus.generalSettings.prefix}timer `)) {
            return;
        }

        command = command.replace(`${rustplus.generalSettings.prefix}timer `, '');
        let subcommand = command.replace(/ .*/, '');
        command = command.slice(subcommand.length + 1);

        if (subcommand !== 'remain' && command === '') {
            return;
        }

        let id;
        switch (subcommand) {
            case 'add':
                let time = command.replace(/ .*/, '');
                let timeSeconds = Timer.getSecondsFromStringTime(time);
                if (timeSeconds === null) {
                    return;
                }

                id = 0;
                while (Object.keys(rustplus.timers).map(Number).includes(id)) {
                    id += 1;
                }

                let message = command.slice(time.length + 1);
                if (message === "") {
                    return;
                }

                rustplus.timers[id] = {
                    timer: new Timer.timer(
                        () => {
                            rustplus.printCommandOutput(`Timer: ${message}`, 'TIMER');
                            delete rustplus.timers[id]
                        },
                        timeSeconds * 1000),
                    message: message
                };
                rustplus.timers[id].timer.start();

                rustplus.printCommandOutput(`Timer set for ${time}.`);
                break;

            case 'remove':
                id = parseInt(command.replace(/ .*/, ''));
                if (id === 'NaN') {
                    return;
                }

                if (!Object.keys(rustplus.timers).map(Number).includes(id)) {
                    return;
                }

                rustplus.timers[id].timer.stop();
                delete rustplus.timers[id];

                rustplus.printCommandOutput(`Timer with ID: ${id} was removed`);
                break;

            case 'remain':
                if (Object.keys(rustplus.timers).length === 0) {
                    rustplus.printCommandOutput('No active timers.');
                }
                else {
                    rustplus.printCommandOutput('Active timers:');
                }
                for (const [id, content] of Object.entries(rustplus.timers)) {
                    let timeLeft = Timer.getTimeLeftOfTimer(content.timer);
                    let str = `- ID: ${parseInt(id)}, Time left: ${timeLeft}, Message: ${content.message}`;
                    rustplus.printCommandOutput(str);
                }
                break;

            default:
                break;
        }
    },

    commandUnmute: function (rustplus, client) {
        let instance = client.readInstanceFile(rustplus.guildId);
        rustplus.generalSettings.muteInGameBotMessages = false;
        instance.generalSettings.muteInGameBotMessages = false;
        client.writeInstanceFile(rustplus.guildId, instance);

        let str = `In-Game chat unmuted.`;
        rustplus.printCommandOutput(str);
    },

    commandWipe: function (rustplus) {
        let str = `${rustplus.info.getTimeSinceWipe()} since wipe.`;
        rustplus.printCommandOutput(str);
    },
};