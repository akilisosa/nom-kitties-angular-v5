import { util } from '@aws-appsync/utils';

// Atomically appends the caller (identity.sub) to Room.players.
// Refused unless the room is WAITING, the caller isn't already in it, and it isn't full.
export function request(ctx) {
  const me = ctx.identity.sub;
  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({ id: ctx.args.roomId }),
    update: {
      expression:
        'SET #players = list_append(if_not_exists(#players, :empty), :meList), #updatedAt = :now',
      expressionNames: { '#players': 'players', '#updatedAt': 'updatedAt' },
      expressionValues: util.dynamodb.toMapValues({
        ':empty': [],
        ':meList': [me],
        ':now': util.time.nowISO8601(),
      }),
    },
    condition: {
      expression:
        'attribute_exists(#id) AND #status = :waiting AND ' +
        '(attribute_not_exists(#players) OR (NOT contains(#players, :me) AND ' +
        '(attribute_not_exists(#roomLimit) OR attribute_type(#roomLimit, :nullType) OR size(#players) < #roomLimit)))',
      expressionNames: {
        '#id': 'id',
        '#status': 'status',
        '#players': 'players',
        '#roomLimit': 'roomLimit',
      },
      expressionValues: util.dynamodb.toMapValues({
        ':waiting': 'WAITING',
        ':me': me,
        ':nullType': 'NULL',
      }),
    },
  };
}

export function response(ctx) {
  if (ctx.error) {
    if (ctx.error.type === 'DynamoDB:ConditionalCheckFailedException') {
      util.error('Room is full, already started, or you already joined.', 'JoinRefused');
    }
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result;
}
