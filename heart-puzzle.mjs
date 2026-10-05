export const PUZZLE_SIZE=9;
export const correctPieces=board=>board.reduce((count,piece,index)=>count+Number(piece===index),0);
export function validBoard(board){return Array.isArray(board)&&board.length===9&&new Set(board).size===9&&board.every(n=>Number.isInteger(n)&&n>=0&&n<9);}
export function shuffleHeart(random=Math.random){
  const board=Array.from({length:9},(_,i)=>i);
  for(let i=8;i>0;i--){const j=Math.floor(random()*(i+1));[board[i],board[j]]=[board[j],board[i]];}
  // Avoid an almost-finished board, including under deterministic random sources.
  if(correctPieces(board)>2)return [5,2,7,6,0,8,1,4,3];
  return board;
}
export function swapPieces(board,a,b){
  if(!validBoard(board)||![a,b].every(n=>Number.isInteger(n)&&n>=0&&n<9))return board;
  const next=[...board];[next[a],next[b]]=[next[b],next[a]];return next;
}
