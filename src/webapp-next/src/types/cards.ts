export interface CardAction {
  package: string;
  plugin: string;
  method: string;
  args?: unknown[];
  kwargs?: Record<string, unknown>;
}

export interface Card {
  id: string;
  from_alias: string;
  action: CardAction;
}

export type CardsMap = Record<string, Card>;
