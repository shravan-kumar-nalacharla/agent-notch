from pathlib import Path
root=Path(__file__).resolve().parents[1]
def edit(name,a,b):
 p=root/name;s=p.read_text(encoding='utf-8');assert a in s,name;s=s.replace(a,b);p.write_text(s,encoding='utf-8')
edit('src/browser-controller.cjs',"await item.locator.click();}","const popup=await item.locator.getAttribute('target')==='_blank'?page.waitForEvent('popup',{timeout:8000}):null;await item.locator.click();if(popup){page=await popup;await page.waitForLoadState('domcontentloaded');}}")
edit('scripts/check-live-browser.cjs',"}finally{fs.mkdirSync(out", "}finally{if(browser.current){fs.writeFileSync(path.join(out,'live-browser-observation.json'),JSON.stringify(browser.current,null,2));if(browser.page&&!browser.page.isClosed())await browser.page.screenshot({path:path.join(out,'live-browser-redacted.png'),mask:[browser.page.locator('input,textarea,pre,code,table,[data-secret],[data-private]')]}).catch(()=>{});}fs.mkdirSync(out")
