# netflix-hot-mouse

## Description

Simple tool increasing UX while using mouse in netflix web app (useful when used e.g. compute stick without keyboard). This library allows you to control your viewing experience directly from your mouse while watching on your computer browser. See below for a list of all supported mouse commands.

## Commands

* Right button click - Toggle Play / Pause
* Wheel scrolling - Volume Up / Down 
* Wheel scrolling with hold left button - Subtitles Lower / Bigger (size beetwen from 0px to 57px, this settings is remembered in cookie)
* Wheel scrolling with hold right button - Rewind / Forward
* Wheel click - context action, one from list:
   * If you are on netflix site, but you aren't watching video - redirect to last watched video,
   * If option "skip credits" currently is enabled, trigger skip credits,
   * Toggle Full-screen toggle

## Installing

1. Install Tampermonkey in your browser
   1. Google Chrome: https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en
   1. Mozilla Firefox: https://addons.mozilla.org/pl/firefox/addon/tampermonkey/
1. Click on Tampermonkey icon, choose "Add a new script"
1. Paste content from index.js
1. Open video on netflix.com and enjoy using your mouse!
