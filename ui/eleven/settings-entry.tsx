import {installAstryx} from './astryx-bridge';
installAstryx();
(window as any).islandSettingsComponentsReady=true;
(window as any).islandSettingsReady?.();
