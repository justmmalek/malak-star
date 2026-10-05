import {shuffleHeart,correctPieces,validBoard,swapPieces} from './heart-puzzle.mjs';
import {TOTAL_BRICKS} from './star-breaker-model.mjs';
export const GOALS={connect:9,chase:TOTAL_BRICKS};
const STORAGE='malak-gift-journey-v4';
const fresh=()=>{const board=shuffleHeart();return {version:5,heartFound:false,bricks:[],board,puzzleMoves:0,connect:correctPieces(board),chase:0,completed:{connect:false,chase:false},unlocked:false,entered:false};};
export function parseGiftState(raw){
  try{
    const s=JSON.parse(raw);
    if(s?.version===4){s.version=5;s.bricks=[];s.chase=0;if(s.completed)s.completed.chase=s.unlocked===true;}
    if(s?.version!==5||typeof s.unlocked!=='boolean'||!validBoard(s.board)||correctPieces(s.board)!==s.connect)return fresh();
    if(!Array.isArray(s.bricks)||new Set(s.bricks).size!==s.bricks.length||s.bricks.some(id=>!Number.isInteger(id)||id<0||id>=TOTAL_BRICKS)||s.bricks.length!==s.chase)return fresh();
    for(const mode of ['connect','chase']){
      if(!Number.isInteger(s[mode])||s[mode]<0||s[mode]>GOALS[mode]||typeof s.completed?.[mode]!=='boolean')return fresh();
      if(mode==='connect'&&s[mode]===GOALS[mode]&&!s.completed[mode])return fresh();
    }
    if(s.unlocked&&(!s.completed.connect||!s.completed.chase))return fresh();
    if(s.entered&&!s.unlocked)return fresh();
    return {version:5,heartFound:s.heartFound===true,bricks:[...s.bricks],board:[...s.board],puzzleMoves:Number.isInteger(s.puzzleMoves)&&s.puzzleMoves>=0?s.puzzleMoves:0,connect:s.connect,chase:s.chase,completed:{...s.completed},unlocked:s.unlocked,entered:s.entered===true};
  }catch{return fresh();}
}
let state;
try{state=parseGiftState(globalThis.localStorage?.getItem(STORAGE));}catch{state=fresh();}
const listeners=new Set();
export function getGiftState(){return {...state,bricks:[...state.bricks],board:[...state.board],completed:{...state.completed}};}
export function nextGiftGame(){return !state.completed.connect?'connect':!state.completed.chase?'chase':null;}
export function subscribeGift(listener){listeners.add(listener);return()=>listeners.delete(listener);}
function save(reason){try{globalThis.localStorage?.setItem(STORAGE,JSON.stringify(state));}catch{/* Continue in memory when storage is unavailable. */}for(const listener of listeners)listener(getGiftState(),reason);}
export function hitGiftBricks(ids){
  state.bricks=[...new Set([...state.bricks,...ids.filter(id=>Number.isInteger(id)&&id>=0&&id<TOTAL_BRICKS)])];
  state.chase=state.bricks.length;save('progress');
}
export function completeBreaker(){state.heartFound=true;state.completed.chase=true;save('progress');}
export function replayGiftGame(mode){if(!(mode in GOALS))return;if(mode==='connect'){state.board=shuffleHeart();state.puzzleMoves=0;state.connect=correctPieces(state.board);}else {state.chase=0;state.bricks=[];state.heartFound=false;}save('replay');}
export function swapGiftPieces(a,b){if(a===b)return;state.puzzleMoves++;state.board=swapPieces(state.board,a,b);state.connect=correctPieces(state.board);if(state.connect===9)state.completed.connect=true;save('progress');}
export function unlockGift(){if(nextGiftGame())return false;state.unlocked=true;save('unlock');return true;}
export function enterGift(){if(!state.unlocked)return false;state.entered=true;save('enter');return true;}
export function resetGift(){state=fresh();save('reset');}
