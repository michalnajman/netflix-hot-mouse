/*================================================================
This plugin allows you to control your viewing experience directly from your mouse while watching on your computer browser. See below for a list of all supported mouse commands.

* Right button click - Toggle Play / Pause
* Wheel scrolling - Volume Up / Down 
* Wheel scrolling with hold left button - Subtitles Lower / Bigger (size beetwen from 0px to 67px, this settings is remembered in the cookie)
* Wheel scrolling with hold right button - Rewind / Forward
* Wheel click - Context action, one from list:
   * If you are on netflix site, but you aren't watching video - redirect to last watched video (remembered in the cookie)
   * If option "skip credits" currently is enabled, trigger skip credits
   * Otherwise toggle full-screen

   
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

    function run() {

        let $ = window.jQuery;

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
                });
            }

            /////////////////////////////////////////////////////////////////////////////////
            // MAIN LOGIC
            /////////////////////////////////////////////////////////////////////////////////

            function createLogic() {

                function playToggle(showInfo) {

                    if (showInfo) {
                        let isVideoRunning = $(".icon-player-pause").length === 1;

                        if (isVideoRunning) {
                            let videoPercentProgress = $(".player-slider").attr("aria-valuenow");

                            $(".nhm-info").stop(true, false).animate({ opacity: 0.8 }, 300);
                            $(".nhm-info-value").html($(".player-slider label").html());
                            $(".nhm-info-fill").css("width", videoPercentProgress + "%");
                        } else {
                            $(".nhm-info").stop(true, false).animate({ opacity: 0 }, 300);
                        }
                    }

                    $(".icon-player-pause, .icon-player-play").trigger("click");
                    helper.log("Play/pause", "toggled");
                }

                function changeSubtitlesSize(direction) {
                    let cookieName = "subtitles-size",
                        cookieSubtitlesSize = parseInt(helper.getCookie(cookieName)) || 32; // default value

                    cookieSubtitlesSize += direction;

                    if (cookieSubtitlesSize < 0) {
                        cookieSubtitlesSize = 0;
                    } else if (cookieSubtitlesSize > 67) { // max predefined size in netflix
                        cookieSubtitlesSize = 67;
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

                function skipCredits() {
                    if ($(".skip-credits").length === 1) {
                        $(".skip-credits .nf-flat-button-text").trigger("click");
                        helper.log("Credits", "skipped");
                        return true;
                    } else {
                        return false;
                    }
                }

                let currentVideoUrl = {
                    cookieName: "last-video-url",

                    set: function() {
                        if (window.location.pathname.indexOf("/watch/") === 0) {
                            helper.createCookie(this.cookieName, window.location.href);
                        }
                    },

                    get: function() {
                        // return only if current url isn't a video
                        if (window.location.pathname.indexOf("/watch/") === 0) {
                            return null;
                        }
                        return helper.getCookie(this.cookieName);
                    }
                };

                function makeContextAction() {
                    if (currentVideoUrl.get() != null) {
                        window.location = currentVideoUrl.get();
                    } else if (!skipCredits()) {
                        fullscreenToggle();
                    }
                }

                function moveVideo(direction) {
                    direction > 0 ?
                        helper.triggerKeyDownEvent(39) : // forward
                        helper.triggerKeyDownEvent(37); // backward

                    helper.log("Scroll video", `direction: ${direction}`);
                }

                function addPauseHtml() {
                    $("body").append($("<div/>", {
                        class: "nhm-info",
                        css: {
                            transform: "translate(-50%, -50%)",
                            width: "1000px",
                            height: "100px",
                            left: "50%",
                            top: "50%",
                            "text-align": "center",
                            background: "#000",
                            border: "5px solid #AC090B",
                            "border-radius": "10px",
                            position: "fixed",
                            "z-index": "2147483647",
                            font: "bold 60px Arial",
                            overflow: "hidden",
                            color: "#fff",
                            opacity: 0
                        }
                    }));

                    $(".nhm-info").append($("<div/>", {
                        class: "nhm-info-value",
                        html: "00:00",
                        css: {
                            "line-height": "100px"
                        }
                    }));

                    $(".nhm-info").append($("<div/>", {
                        class: "nhm-info-fill",
                        css: {
                            background: "#AC090B",
                            display: "block",
                            width: "0%",
                            height: "100%",
                            "z-index": "-1",
                            position: "absolute",
                            left: "0",
                            bottom: "0"
                        }
                    }));
                }

                function init() {
                    addPauseHtml();
                    changeSubtitlesSize(0);
                    currentVideoUrl.set(); // if current url is video, save it into the cookie
                    helper.log("Initialized", "done");

                    return {
                        playToggle,
                        moveVideo,
                        changeSubtitlesSize,
                        changeVolume,
                        makeContextAction
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

                let logic = createLogic().init();

                createHandlers({
                    onMouseRightButtonClick: () => { logic.playToggle(true); },
                    onMouseWheel: (direction, pressedMouseButtonIndex) => {
                        switch (pressedMouseButtonIndex) {
                        case 1:
                            logic.changeSubtitlesSize(direction);
                            return;
                        case 3:
                            logic.moveVideo(direction);
                            logic.playToggle(false);
                            return;
                        default:
                            logic.changeVolume(direction);
                        }
                    },
                    onMouseWheelButtonClick: () => { logic.makeContextAction(); }
                });
            }());
        });
    }

    // get jQuery for DOM manipulation
    let script = document.createElement("script");
    script.src = "https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js";
    script.type = "text/javascript";
    script.onload = () => run();

    document.getElementsByTagName("head")[0].appendChild(script);

})();
