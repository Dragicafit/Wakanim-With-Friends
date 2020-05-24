(function () {
    if (window.hasRun) {
        console.log("already running");
        browser.runtime.sendMessage({
            command: 'scipt loaded'
        });
        return;
    }
    window.hasRun = true;

    browser.runtime.onMessage.addListener(message => {
        document.dispatchEvent(new CustomEvent(message.command, { detail: JSON.stringify(message) }));
    });

    document.addEventListener('send info', e => {
        var data = JSON.parse(e.detail);
        browser.runtime.sendMessage({
            command: 'send info',
            username: data.username,
            roomnum: data.roomnum
        });
    });

    document.addEventListener('changeVideoClient', e => {
        var data = JSON.parse(e.detail);
        browser.runtime.sendMessage({
            command: 'changeVideoClient',
            videoId: data.videoId,
            location: data.location
        });
    });

    var s = document.createElement('script');
    s.src = browser.runtime.getURL('/js/script.js');
    s.onload = function () {
        this.remove();
        browser.runtime.sendMessage({
            command: 'scipt loaded'
        });
    };
    (document.head || document.documentElement).appendChild(s);
})();