export const INTRO_KEY = 'porsi-intro-seen';

/**
 * Inline script that runs before React hydrates, so a returning visitor never
 * sees the intro flash. The intro is skipped when the tab already showed it,
 * when the first page is a workspace (those have their own loading screen) and
 * in automated browsers. Add ?intro=1 to the address to force it.
 * Written without regular expressions so no escaping can break it.
 */
export const introGate = `(function(){var d=document.documentElement;try{var p=location.pathname;var app=['/customer','/mahasiswa','/gerai','/pengelola'].some(function(r){return p===r||p.indexOf(r+'/')===0});var force=location.search.indexOf('intro=1')>-1;var seen=sessionStorage.getItem('${INTRO_KEY}');if(!force&&(app||seen||navigator.webdriver===true))d.setAttribute('data-intro','skip')}catch(e){d.setAttribute('data-intro','skip')}})();`;
