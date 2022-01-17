import { ctx } from "../render";
import { positionCenteredAt } from "../utils/geometry";

export function drawPath(path) {

  let prevPos = path[0];

  for (let i = 1; i < path.length; i++) {

    let curPos = path[i];

    let prevPosGame = positionCenteredAt(prevPos.x, prevPos.y);
    let curPosGame = positionCenteredAt(curPos.x, curPos.y);

    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 8;
    ctx.globalAlpha = 0.5;
    drawArrow(prevPosGame.x, prevPosGame.y, curPosGame.x, curPosGame.y);
    ctx.globalAlpha = 1;

    prevPos = curPos;

  }

}

function drawArrow( fromx, fromy, tox, toy ) {
  const dx = tox - fromx;
  const dy = toy - fromy;
  const headlen = Math.sqrt( dx * dx + dy * dy ) * 0.3; // length of head in pixels
  const angle = Math.atan2( dy, dx );
  ctx.beginPath();
  ctx.moveTo( fromx, fromy );
  ctx.lineTo( tox, toy );
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo( tox - headlen * Math.cos( angle - Math.PI / 6 ), toy - headlen * Math.sin( angle - Math.PI / 6 ) );
  ctx.lineTo( tox, toy );
  ctx.lineTo( tox - headlen * Math.cos( angle + Math.PI / 6 ), toy - headlen * Math.sin( angle + Math.PI / 6 ) );
  ctx.stroke();
}
