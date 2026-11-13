'use strict';
const components=document.createElement('script');
components.src=new URLSearchParams(location.search).has('settings')?'vendor/settings-components.js':'vendor/eleven-components.js';
components.async=false;document.body.append(components);
