var roomnum = "";
var username = "";
var tab;
// Don't allow trailing or leading whitespace!
var nosymbols = /^[\w-]+$/;

// Chat stuff
function chat() {
    $(function () {
        var $roomArea = $('#roomArea');
        var $userFormArea = $('#userFormArea');
        var $userForm = $('#userForm');
        var $username = $('#username');
        var $roomnum = $('#roomnum');


        // Submit user form
        $userForm.submit(function (e) {
            e.preventDefault();
            // console.log("Submitted");
            // New User

            // Get rid of trailing/leading whitespace
            // var roomnum_val = $roomnum.val().trim();

            // If name not entered
            if ($username.val() == "") {
                console.log("ENTER A NAME");
                var noname = document.getElementById('missinginfo');
                noname.innerHTML = "Surely you have a name right? Enter it below!";
            }
            // If name is too long
            else if ($username.val().length > 30) {
                console.log("NAME IS TOO LONG");
                var noname = document.getElementById('missinginfo');
                noname.innerHTML = "Your name can't possibly be over 30 characters!";
            }
            // If roomnate
            else if ($roomnum.val().length > 50) {
                console.log("ROOM NAME IS TOO LONG");
                var noname = document.getElementById('missinginfo');
                noname.innerHTML = "How are you going to remember a room code that has more than 50 characters?";
            }
            // If Room contains symbols
            // Can only be reached if the user decided to be sneaky and paste them!
            else if (!nosymbols.test($roomnum.val())) {
                console.log("ENTER A PROPER ROOMNUMBER");
                var noname = document.getElementById('missinginfo');
                noname.innerHTML = "";
                var noname2 = document.getElementById('missinginfo2');
                noname2.innerHTML = "Please enter a room ID without symbols or leading/trailing whitespace!";
            } else {
                chrome.tabs.sendMessage(tab,
                    {
                        command: 'new user',
                        username: $username.val(),
                    });

                // Join room
                chrome.tabs.sendMessage(tab,
                    {
                        command: 'new room',
                        roomnum: $roomnum.val()
                    });
                $username.val('');
            }
        });


        // Prevent special characters from being typed
        $('#roomnum').on('keypress', function (event) {
            var key = String.fromCharCode(!event.charCode ? event.which : event.charCode);
            console.log(key);
            console.log(event.keyCode);
            // Allow enters and spaces to be used still
            if ($roomnum.val().length > 50 || !nosymbols.test(key) && event.keyCode != 13 && event.keyCode != 32 && event.keyCode != 45 && event.keyCode != 95) {
                event.preventDefault();
                return false;
            }
        });

        // Prevent special characters from being typed
        $('#username').on('keypress', function (event) {
            var key = String.fromCharCode(!event.charCode ? event.which : event.charCode);
            // Allow enters and spaces to be used still
            if ($username.val().length > 30 || !nosymbols.test(key) && event.keyCode != 13 && event.keyCode != 32 && event.keyCode != 45 && event.keyCode != 95) {
                event.preventDefault();
                return false;
            }
        });

        chrome.runtime.onMessage.addListener(message => {
            if (message.command == 'send info') {
                console.log("get info");

                if (message.username)
                    username = message.username;
                if (message.roomnum)
                    roomnum = message.roomnum;

                // Sets the invite link (roomnum)
                // document.getElementById('invite').innerHTML = "vynchronize.herokuapp.com/" + roomnum
                document.getElementById("inv_input").value = "vynchronize.herokuapp.com/" + roomnum;
            }
        });
        console.log("ask info");
        chrome.tabs.sendMessage(tab, {
            command: 'ask info'
        });
    });
}

function copyInvite() {
    /* Get the text field */
    var copyText = document.getElementById("inv_input");
    console.log(copyText);
    /* Select the text field */
    copyText.select();
    /* Copy the text inside the text field */
    document.execCommand("Copy");
    /* Alert the copied text */
    // alert("Copied the text: " + copyText.value);
    var tooltip = document.getElementById("myTooltip");
    tooltip.innerHTML = "Copied!";
}

function outFunc() {
    var tooltip = document.getElementById("myTooltip");
    tooltip.innerHTML = "Copy to clipboard";
}

// Generate a random alphanumeric room id
function randomroom() {
    document.getElementById('roomnum').value = Math.random().toString(36).substr(2, 12);
}

/**
 * Just log the error to the console.
 */
function reportError(error) {
    console.error(`Could not beastify: ${error}`);
}

var listener = message => {
    if (message.command == 'scipt loaded') {
        console.log("scipt loaded");
        chrome.runtime.onMessage.removeListener(listener);
        chat();
    }
};
chrome.runtime.onMessage.addListener(listener);

chrome.tabs.query({
    currentWindow: true,
    active: true,
    url: "*://*.wakanim.tv/*"
}, tabs => {
    if (tabs.length == 0) {
        chrome.tabs.create({ url: "https://www.wakanim.tv/" }, injectScript);
    } else {
        injectScript(tabs[0]);
    }
});

function injectScript(tabId) {
    console.log(tabId);
    tab = tabId.id;
    chrome.tabs.executeScript(tab, {
        runAt: "document_end",
        file: "/js/listener.js"
    })
    chrome.runtime.sendMessage({
        command: 'createVideoClient',
        'tab': tab
    });
}