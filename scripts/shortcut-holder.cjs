'use strict';
const {app,globalShortcut}=require('electron');
app.whenReady().then(()=>{console.log(globalShortcut.register('Control+Alt+Y',()=>{})?'SHORTCUT HELD':'SHORTCUT FAILED');setTimeout(()=>app.exit(),20000);});
