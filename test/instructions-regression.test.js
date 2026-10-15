import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
globalThis.instructionsCatalog=JSON.parse(readFileSync(new URL('../locales/instructions.ko.json',import.meta.url),'utf8'));
const {translateInstructions,enhanceInstructionsPanel}=await import('../src/ui/instructions.js');
class Element {
 constructor(tag='DIV'){this.tagName=tag;this.attrs=new Map();this.style={};this.listeners={};this.children=[];this.value='original';this.textContent='';}
 hasAttribute(k){return this.attrs.has(k)} setAttribute(k,v){this.attrs.set(k,v)}
 addEventListener(k,f){this.listeners[k]=f} removeEventListener(){} dispatchEvent(e){this.listeners[e.type]?.(e);return true}
 appendChild(c){this.children.push(c);c.parentElement=this;return c} insertBefore(c){return this.appendChild(c)}
 querySelector(s){if(s.includes('justify-between'))return this.header??null;if(s.includes('textarea'))return this.editor??null;if(s.includes('gap-2'))return null;return null}
 querySelectorAll(){return []}
}
function panel(){const p=new Element();p.header=new Element();p.editor=new Element('TEXTAREA');p.appendChild(p.editor);globalThis.document={createElement:tag=>new Element(tag.toUpperCase())};globalThis.window={addEventListener(){},removeEventListener(){}};return p}
test('cache collision does not return another source',()=>{translateInstructions('Aa','ko');assert.equal(translateInstructions('BB','ko'),'BB')});
test('unknown English heading is marked untranslated',()=>assert.match(translateInstructions('# Unmapped instructions heading','ko'),/미번역/));
test('late editor mount remains retryable',()=>{const p=panel();p.editor=null;enhanceInstructionsPanel(p,'en');assert.equal(p.hasAttribute('data-pc-inst-enhanced'),false)});
test('overlay does not duplicate React editor state or toolbar',()=>{const p=panel();enhanceInstructionsPanel(p,'en');assert.equal(p.editor.readOnly,undefined);assert.equal(p.header.children.length,0);assert.equal(p.editor.value,'original')});
test('overlay has actual instructions mount call',()=>assert.match(readFileSync(new URL('../src/ui/overlay.js',import.meta.url),'utf8'),/mountInstructionsPanels\(document\.body/));
