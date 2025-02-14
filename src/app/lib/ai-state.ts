type AIActionType = 'move' | 'chat' | 'analysis';

interface MoveActionData {
  chosenMove: number;
  playerColor: 'w' | 'b';
}

interface ChatActionData {
  response: string;
}

interface AnalysisActionData {
  commented: boolean;
  probability: number;
  comment?: string;
}

type ActionDataMap = {
  'move': MoveActionData;
  'chat': ChatActionData;
  'analysis': AnalysisActionData;
}

interface AIAction {
  type: AIActionType;
  timestamp: number;
  data: MoveActionData | ChatActionData | AnalysisActionData;
}

interface AIActionWithType<T extends AIActionType> extends AIAction {
  type: T;
  data: ActionDataMap[T];
}

type MoveAction = AIActionWithType<'move'>;
type ChatAction = AIActionWithType<'chat'>;
type AnalysisAction = AIActionWithType<'analysis'>;

export interface SerializableAIState {
  gameStates: {
    [gameId: string]: AIAction[];
  }
}

export class AIStateManager {
  private state: Map<string, AIAction[]>;

  constructor(initialState?: SerializableAIState) {
    this.state = new Map<string, AIAction[]>();
    if (initialState) {
      this.loadState(initialState);
    }
  }

  addAction<T extends AIActionType>(gameId: string, action: AIActionWithType<T>): void {
    const actions = this.state.get(gameId) || [];
    actions.push(action);
    if (actions.length > 10) actions.shift();
    this.state.set(gameId, actions);
  }

  getContext(gameId: string): string {
    const actions = this.state.get(gameId) || [];
    if (actions.length === 0) return "No previous AI actions.";

    return actions
      .map(a => {
        const timestamp = new Date(a.timestamp).toISOString();
        const data = JSON.stringify(a.data);
        return `[${timestamp}] ${a.type}: ${data}`;
      })
      .join('\n');
  }

  getActions(gameId: string): AIAction[] {
    return this.state.get(gameId) || [];
  }

  getLastAction(gameId: string): AIAction | null {
    const actions = this.state.get(gameId) || [];
    return actions.length > 0 ? actions[actions.length - 1] : null;
  }

  getActionsByType<T extends AIActionType>(gameId: string, type: T): AIActionWithType<T>[] {
    const actions = this.state.get(gameId) || [];
    return actions.filter((action): action is AIActionWithType<T> => action.type === type);
  }

  generateGameId(board: string): string {
    return `game_${board.replace(/\s+/g, '')}`;
  }

  clearGame(gameId: string): void {
    this.state.delete(gameId);
  }

  clearAllGames(): void {
    this.state.clear();
  }

  toJSON(): SerializableAIState {
    const gameStates: { [key: string]: AIAction[] } = {};
    this.state.forEach((value, key) => {
      gameStates[key] = value;
    });
    return { gameStates };
  }

  loadState(serializedState: SerializableAIState): void {
    this.state.clear();
    Object.entries(serializedState.gameStates).forEach(([key, value]) => {
      this.state.set(key, value);
    });
  }
}

export function createAIStateManager(initialState?: SerializableAIState): AIStateManager {
  return new AIStateManager(initialState);
}

export function createCleanAIState(): SerializableAIState {
  return { gameStates: {} };
}

export function isMoveAction(action: AIAction): action is MoveAction {
  return action.type === 'move';
}

export function isChatAction(action: AIAction): action is ChatAction {
  return action.type === 'chat';
}

export function isAnalysisAction(action: AIAction): action is AnalysisAction {
  return action.type === 'analysis';
}
