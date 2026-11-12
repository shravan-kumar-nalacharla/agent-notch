'use strict';
const FONTS=['system','arial','serif','mono'];
function validateVisualStyle(value={}){const result={};if(value.accentColor!==undefined){if(typeof value.accentColor!=='string'||!/^#[0-9a-f]{6}$/i.test(value.accentColor))throw Error('Choose a valid accent color.');result.accentColor=value.accentColor.toLowerCase();}if(value.uiFont!==undefined){if(!FONTS.includes(value.uiFont))throw Error('Choose a supported font.');result.uiFont=value.uiFont;}return result;}
module.exports={validateVisualStyle,FONTS};
