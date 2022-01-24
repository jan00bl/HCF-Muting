const hyperxCloudFlight = require('hyperx-cloud-flight-wireless')({updateDelay:1000});
const ConsoleWindow = require("node-hide-console-window");
const win = require('win-audio');
const Systray = require('systray');
const fs = require("fs");
const path = require("path");

ConsoleWindow.hideConsole();

let cleanedUp = false;

let percentage = 100;
let muted = false;
let charging = false;

let icons = [
    ["on","on-80","on-60","on-40","on-20","on-charging"],
    ["off","off-80","off-60","off-40","off-20","off-charging"],
    ["power-off"]
]

icons.forEach((i,index) => {
    icons[index] = i.map(e => fs.readFileSync(path.join(__dirname, `icons/${process.platform === 'win32' ? `win/${e}.ico` : `unix/${e}.png`}`)))
})

let exitItem = {
    title: "Exit",
    tooltip: "bb",
    checked: false,
    enabled: true
};


let consoleItem = {
    title: "Show Console",
    tooltip: "bb",
    checked: false,
    enabled: true
}

let menu = {
    icon: icons[2][0].toString('base64'),
    title: 'Mic',
    tooltip: `Power Off`,
    items: [consoleItem,exitItem]
}

let systray = new Systray.default({
    menu: menu
});

systray.onClick(onClick);

setTimeout(createHCFListener,100);

[`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach((eventType) => {
    process.on(eventType, cleanUp);
})

function createHCFListener() {
    hyperxCloudFlight.on("battery", p => {
        percentage = p;
        charging = false;
        console.log(`percentage: ${p}`);
        mute();
    })
    
    
    hyperxCloudFlight.on("muted", (m) => {
        muted = m;
        console.log(`muted: ${m}`);
        mute();
    })
    
    hyperxCloudFlight.on("charging", c => {
        charging = c;
        console.log(`charging: ${c}`);
        mute();
    })
    
    hyperxCloudFlight.on("power", c => {
        console.log(`power: ${c}`);
        if(c === "off") {
            setTray(2,0,"Power Off");
        }
    })
}


function mute() {
    if(muted) {
        win.mic.mute()
        setTrayAfterPercentage(1);
    } else {
        win.mic.unmute()
        setTrayAfterPercentage(0);
    }
}

function setTrayAfterPercentage(type) {
    if(charging) {
        setTray(type,5);
    } else if(percentage > 80) {
        setTray(type,0);
    } else if(percentage > 60) {
        setTray(type,1);
    } else if(percentage > 40) {
        setTray(type,2);
    } else if(percentage > 20) {
        setTray(type,3);
    } else {
        setTray(type,4);
    }
}

function setTray(type,index,tooltip) {
    let charge = charging? "Charging" : percentage + "%";

    menu.tooltip = tooltip? tooltip : `Charge: ${charge}`;
    menu.icon = icons[type][index].toString('base64');

    systray.sendAction({
        type: 'update-menu',
        menu: menu
    });
}

/**
 * @param  {Systray.UpdateItemAction} action
 */
function onClick(action) {

    switch (action.item.title) {
        case "Exit":
            process.exit();
        case "Show Console":
            consoleItem.checked = !consoleItem.checked
            if(consoleItem.checked) {
                ConsoleWindow.showConsole();
            } else {
                ConsoleWindow.hideConsole();
            }

            systray.sendAction({
                type: "update-item",
                item: consoleItem
            });
            break;
    
        default:
            break;
    }

}


function cleanUp() {
    if(!cleanedUp) {
        cleanedUp = true;
        win.mic.unmute();
        console.log("clean up");
        process.exit();
    }
}