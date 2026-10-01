import { util, runtime } from '@aws-appsync/utils';

// Second step of leaveRoom: remove the caller (identity.sub) from Room.players.
// The condition guards against the list shifting between the read and this write.
export function request(ctx) {
  const me = ctx.identity.sub;
  const room = ctx.stash.room;
  const idx = (room.players || []).indexOf(me);
  if (idx < 0) {
    runtime.earlyReturn(room);
  }
  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({ id: ctx.args.roomId }),
    update: {
      expression: `REMOVE #players[${idx}] SET #updatedAt = :now`,
      expressionNames: { '#players': 'players', '#updatedAt': 'updatedAt' },
      expressionValues: util.dynamodb.toMapValues({ ':now': util.time.nowISO8601() }),
    },
    condition: {
      expression: `#players[${idx}] = :me`,
      expressionNames: { '#players': 'players' },
      expressionValues: util.dynamodb.toMapValues({ ':me': me }),
    },
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result;
}
