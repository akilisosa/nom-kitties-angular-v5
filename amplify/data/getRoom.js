import { util } from '@aws-appsync/utils';

// First step of leaveRoom: load the room so the next step can find the caller's index.
export function request(ctx) {
  return {
    operation: 'GetItem',
    key: util.dynamodb.toMapValues({ id: ctx.args.roomId }),
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  if (!ctx.result) {
    util.error('Room not found.', 'NotFound');
  }
  ctx.stash.room = ctx.result;
  return ctx.result;
}
