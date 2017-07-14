
/*================================================================
This plugin allows you to control your viewing experience directly from your mouse while watching on your computer browser. See below for a list of all supported mouse commands.

Right button click - Toggle Play / Pause
Wheel click - Toggle Full-screen toggle
Wheel scrolling - Volume Up / Down
Wheel scrolling with holding left button - Subtitles Bigger / Lower (this settings is remembered in cookie)
Wheel scrolling with holding right button - Rewind / Forward

================================================================*/

// ==UserScript==
// @name         netflix-hot-mouse
// @version      0.9
// @description  tool increasing UX while using mouse in netflix web app
// @author       Michał Najman (https://github.com/michalnajman)
// @include      https://*netflix.com*
// @grant        none
// ==/UserScript==

(function netflixHotMouse() {
    "use strict";


    // get jQuery for DOM manipulation
    let script = document.createElement("script");
    script.src = "https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js";
    script.type = "text/javascript";
    script.onload = function onload() {

        $(document).ready(function onDocumentReady() {

            /////////////////////////////////////////////////////////////////////////////////
            // HELPER FUNCTIONS
            /////////////////////////////////////////////////////////////////////////////////

            let helper = {
                createCookie: function(name, value) {

                    let date = new Date();
                    date.setTime(date.getTime() + (365 * 24 * 60 * 60 * 1000));
                    let expires = "; expires=" + date.toGMTString();

                    document.cookie = name + "=" + value + expires + "; path=/";
                },

                getCookie: function(name) {
                    let nameEq = name + "=";
                    let ca = document.cookie.split(";");
                    for (let i = 0; i < ca.length; i++) {
                        let c = ca[i];
                        while (c.charAt(0) === " ") c = c.substring(1, c.length);
                        if (c.indexOf(nameEq) === 0) return c.substring(nameEq.length, c.length);
                    }
                    return null;
                },

                addHeadStyle: function(style) {
                    $("head").append(`<style type='text/css'>${style}</style>`);
                },

                log: function(key, value) {
                    console.log(`[netflix-hot-mouse] ${key}: ${value}`);
                },

                triggerKeyDownEvent: function(k) {

                    let oEvent = document.createEvent("KeyboardEvent");

                    // Chromium Hack
                    Object.defineProperty(oEvent, "keyCode", {
                        get: function() {
                            return this.keyCodeVal;
                        }
                    });
                    Object.defineProperty(oEvent, "which", {
                        get: function() {
                            return this.keyCodeVal;
                        }
                    });

                    if (oEvent.initKeyboardEvent) {
                        oEvent.initKeyboardEvent("keydown", true, true, document.defaultView, false, false, false, false, k, k);
                    } else {
                        oEvent.initKeyEvent("keydown", true, true, document.defaultView, false, false, false, false, k, 0);
                    }

                    oEvent.keyCodeVal = k;

                    if (oEvent.keyCode !== k) {
                        console.log("keyCode mismatch " + oEvent.keyCode + "(" + oEvent.which + ")");
                    }

                    document.dispatchEvent(oEvent);
                }
            };

            /////////////////////////////////////////////////////////////////////////////////
            // EVENT HANDLERS
            /////////////////////////////////////////////////////////////////////////////////

            function createHandlers({ onMouseRightButtonClick, onMouseWheel, onMouseWheelButtonClick } = {}) {

                let ignoreRightButtonMouseUp = false,
                    pressedMouseButtonIndex = null;

                $(window).on("mousedown", e => {

                    pressedMouseButtonIndex = null;
                    if (e.which === 1) {
                        pressedMouseButtonIndex = 1;
                    } else if (e.which === 2) {
                        onMouseWheelButtonClick();
                    } else if (e.which === 3) {
                        pressedMouseButtonIndex = 3;
                    }
                }).on("mouseup", e => {

                    if (!ignoreRightButtonMouseUp && e.which === 3) {
                        onMouseRightButtonClick();
                    }

                    pressedMouseButtonIndex = 0;
                    ignoreRightButtonMouseUp = false;

                }).on("mousewheel DOMMouseScroll", e => {

                    let originalDeltaY = e.originalEvent.wheelDeltaY,
                        detail = e.originalEvent.detail,
                        deltaY = e.deltaY,
                        direction = (originalDeltaY < 0 || detail > 0 || deltaY < 0) ? -1 : 1;

                    ignoreRightButtonMouseUp = true;

                    onMouseWheel(direction, pressedMouseButtonIndex);
                    return false;
                });
            }

            /////////////////////////////////////////////////////////////////////////////////
            // MAIN LOGIC
            /////////////////////////////////////////////////////////////////////////////////

            function createLogic({ fontChangeQuantum }) {

                function playToggle() {
                    $(".icon-player-pause, .icon-player-play").trigger("click");
                    helper.log("Play/pause", "toggled");
                }

                function changeSubtitlesSize(direction) {

                    let cookieName = "subtitles-size",
                        cookieSubtitlesSize = parseInt(helper.getCookie(cookieName)) || 32; // default value

                    cookieSubtitlesSize += (direction * fontChangeQuantum);

                    if (cookieSubtitlesSize < 0) {
                        cookieSubtitlesSize = 0;
                    }

                    helper.createCookie(cookieName, cookieSubtitlesSize);
                    helper.addHeadStyle(`.player-timedtext span { font-size : ${cookieSubtitlesSize}px !important; }`);
                    helper.log("Subtitles", cookieSubtitlesSize);
                }

                function changeVolume(direction) {

                    direction > 0 ?
                        helper.triggerKeyDownEvent(38) : // up
                        helper.triggerKeyDownEvent(40); // down

                    helper.log("Volume", `direction: ${direction}`);
                }

                function fullscreenToggle() {
                    $(".icon-player-full-screen, .icon-player-windowed-screen").trigger("click");
                    helper.log("Fullscreen", "toggled");
                }

                function moveVideo(direction) {

                    direction > 0 ?
                        helper.triggerKeyDownEvent(39) : // forward
                        helper.triggerKeyDownEvent(37); // backward

                    helper.log("Scroll video", `direction: ${direction}`);
                }

                function init() {
                    changeSubtitlesSize(0);

                    return {
                        fullscreenToggle,
                        playToggle,
                        moveVideo,
                        changeSubtitlesSize,
                        changeVolume
                    };
                }

                return {
                    init
                };
            }

            /////////////////////////////////////////////////////////////////////////////////
            // CONSTRUCTOR
            /////////////////////////////////////////////////////////////////////////////////
            (function initialize() {

                let logic = createLogic({
                    fontChangeQuantum: 4
                }).init();

                helper.log("Initialized", "done");

                createHandlers({
                    onMouseRightButtonClick: () => { logic.playToggle(); },
                    onMouseWheel: (direction, pressedMouseButtonIndex) => {
                        switch (pressedMouseButtonIndex) {
                        case 1:
                            logic.changeSubtitlesSize(direction);
                            return;
                        case 3:
                            logic.moveVideo(direction);
                            logic.playToggle();
                            return;
                        default:
                            logic.changeVolume(direction);
                        }
                    },
                    onMouseWheelButtonClick: () => { logic.fullscreenToggle(); }
                });
            }());
        });
    };

    document.getElementsByTagName("head")[0].appendChild(script);

})();
