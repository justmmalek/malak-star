export const PUZZLE_COLUMNS=3,PUZZLE_ROWS=4,PUZZLE_SIZE=PUZZLE_COLUMNS*PUZZLE_ROWS;
// These two bottom corners contain background only, so either order completes the heart.
const BACKGROUND_PIECES=new Set([(PUZZLE_ROWS-1)*PUZZLE_COLUMNS,PUZZLE_SIZE-1]);
export const isPiecePlaced=(piece,index)=>piece===index||(BACKGROUND_PIECES.has(piece)&&BACKGROUND_PIECES.has(index));
export const correctPieces=board=>board.reduce((count,piece,index)=>count+Number(isPiecePlaced(piece,index)),0);
export function validBoard(board){return Array.isArray(board)&&board.length===PUZZLE_SIZE&&new Set(board).size===PUZZLE_SIZE&&board.every(n=>Number.isInteger(n)&&n>=0&&n<PUZZLE_SIZE);}
export function shuffleHeart(random=Math.random){
  const board=Array.from({length:PUZZLE_SIZE},(_,i)=>i);
  for(let i=PUZZLE_SIZE-1;i>0;i--){const j=Math.floor(random()*(i+1));[board[i],board[j]]=[board[j],board[i]];}
  // Avoid an almost-finished board, including under deterministic random sources.
  if(correctPieces(board)>2)return Array.from({length:PUZZLE_SIZE},(_,i)=>(i+7)%PUZZLE_SIZE);
  return board;
}
export function swapPieces(board,a,b){
  if(!validBoard(board)||![a,b].every(n=>Number.isInteger(n)&&n>=0&&n<PUZZLE_SIZE))return board;
  const next=[...board];[next[a],next[b]]=[next[b],next[a]];return next;
}

// Crop the same source coordinate system for every tile, without CSS background offsets.
export function heartPieceRect(piece){
  if(!Number.isInteger(piece)||piece<0||piece>=PUZZLE_SIZE)throw new RangeError('Invalid puzzle piece');
  const width=600/PUZZLE_COLUMNS,height=600/PUZZLE_ROWS;
  return {x:(piece%PUZZLE_COLUMNS)*width,y:Math.floor(piece/PUZZLE_COLUMNS)*height,width,height};
}
