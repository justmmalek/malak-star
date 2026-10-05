import {PUZZLE_SIZE,shuffleHeart,correctPieces,swapPieces} from './heart-puzzle.mjs?v=20261005-easier';
import {TOTAL_BRICKS} from './star-breaker-model.mjs?v=20261005-challenge';
export const GOALS={connect:PUZZLE_SIZE,chase:TOTAL_BRICKS};
const STORAGE='malak-gift-journey-v4';
const fresh=()=>{const board=shuffleHeart();return {version:5,heartFound:false,bricks:[],board,puzzleMoves:0,connect:correctPieces(board),chase:0,completed:{connect:false,chase:false},unlocked:false,entered:false};};
// Keep progress only for the current visit, never restore a previous visit.
let state=fresh();
try{globalThis.localStorage?.removeItem(STORAGE);}catch{/* Storage access is optional. */}
const listeners=new Set();
export function getGiftState(){return {...state,bricks:[...state.bricks],board:[...state.board],completed:{...state.completed}};}
export function nextGiftGame(){return !state.completed.connect?'connect':!state.completed.chase?'chase':null;}
export function resolveGiftView(current,{introSeen=false,giftSeen=false}={},requested='home'){
  if(!current.unlocked)return introSeen?'gate':'intro';
  if(!current.entered)return giftSeen?'certificate':'surprise';
  return requested==='certificate'?'certificate':'home';
}
export function subscribeGift(listener){listeners.add(listener);return()=>listeners.delete(listener);}
function notify(reason){for(const listener of listeners)listener(getGiftState(),reason);}
export function hitGiftBricks(ids){
  state.bricks=[...new Set([...state.bricks,...ids.filter(id=>Number.isInteger(id)&&id>=0&&id<TOTAL_BRICKS)])];
  state.chase=state.bricks.length;notify('progress');
}
export function completeBreaker(){state.heartFound=true;state.completed.chase=true;notify('progress');}
export function replayGiftGame(mode){if(!(mode in GOALS))return;if(mode==='connect'){state.board=shuffleHeart();state.puzzleMoves=0;state.connect=correctPieces(state.board);}else {state.chase=0;state.bricks=[];state.heartFound=false;}notify('replay');}
export function swapGiftPieces(a,b){if(a===b)return;state.puzzleMoves++;state.board=swapPieces(state.board,a,b);state.connect=correctPieces(state.board);if(state.connect===GOALS.connect)state.completed.connect=true;notify('progress');}
export function unlockGift(){if(nextGiftGame())return false;state.unlocked=true;notify('unlock');return true;}
export function enterGift(){if(!state.unlocked)return false;state.entered=true;notify('enter');return true;}
export function resetGift(){state=fresh();notify('reset');}
