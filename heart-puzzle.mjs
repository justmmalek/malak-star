export const PUZZLE_SIDE=4,PUZZLE_SIZE=PUZZLE_SIDE*PUZZLE_SIDE;
export const correctPieces=board=>board.reduce((count,piece,index)=>count+Number(piece===index),0);
export function validBoard(board){return Array.isArray(board)&&board.length===PUZZLE_SIZE&&new Set(board).size===PUZZLE_SIZE&&board.every(n=>Number.isInteger(n)&&n>=0&&n<PUZZLE_SIZE);}
export function shuffleHeart(random=Math.random){
  const board=Array.from({length:PUZZLE_SIZE},(_,i)=>i);
  for(let i=PUZZLE_SIZE-1;i>0;i--){const j=Math.floor(random()*(i+1));[board[i],board[j]]=[board[j],board[i]];}
  // Avoid an almost-finished board, including under deterministic random sources.
  if(correctPieces(board)>1)return Array.from({length:PUZZLE_SIZE},(_,i)=>(i+7)%PUZZLE_SIZE);
  return board;
}
export function swapPieces(board,a,b){
  if(!validBoard(board)||![a,b].every(n=>Number.isInteger(n)&&n>=0&&n<PUZZLE_SIZE))return board;
  const next=[...board];[next[a],next[b]]=[next[b],next[a]];return next;
}
