import { GameManager } from './game';

// Mock the database client to isolate logic tests
jest.mock('@prisma/client', () => {
  const mPrisma = {
    lobby: {
      create: jest.fn().mockImplementation((args) => 
        Promise.resolve({ id: 'lobby_uuid_123', code: args.data.code, status: args.data.status })
      ),
      update: jest.fn().mockResolvedValue({}),
    },
    game: {
      create: jest.fn().mockResolvedValue({ id: 'game_uuid_123' }),
      update: jest.fn().mockResolvedValue({}),
    },
    cell: {
      createMany: jest.fn().mockResolvedValue({ count: 900 }),
    },
    player: {
      findUnique: jest.fn().mockImplementation((args) => 
        Promise.resolve({ id: 'player_db_id', username: args.where.username, color: '#00f0ff', wins: 2, totalGames: 5 })
      ),
      create: jest.fn().mockImplementation((args) => 
        Promise.resolve({ id: 'player_db_id', username: args.data.username, color: args.data.color })
      ),
      update: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
    move: {
      create: jest.fn().mockResolvedValue({}),
    },
    $executeRaw: jest.fn().mockResolvedValue(1), // Mock successful DB lock claim
  };
  return {
    PrismaClient: jest.fn().mockImplementation(() => mPrisma)
  };
});

describe('GameManager Core Logic Unit Tests', () => {
  let gameManager: GameManager;

  beforeEach(() => {
    jest.clearAllMocks();
    gameManager = new GameManager();
  });

  test('Lobby Creation should generate a valid 5-character uppercase code and cache state', async () => {
    const lobby = await gameManager.createLobby();
    
    expect(lobby).toBeDefined();
    expect(lobby.code).toHaveLength(5);
    expect(lobby.code).toBe(lobby.code.toUpperCase());
    expect(lobby.status).toBe('LOBBY');
    
    const retrieved = gameManager.getLobby(lobby.code);
    expect(retrieved).toBe(lobby);
  });

  test('Player Join should successfully bind session details and socket maps', async () => {
    const lobby = await gameManager.createLobby();
    const joined = await gameManager.joinLobby(lobby.code, 'AstroPlayer', '#ff007f', 'socket_123');
    
    expect(joined).not.toBeNull();
    expect(joined?.players.has('AstroPlayer')).toBe(true);
    
    const player = joined?.players.get('AstroPlayer');
    expect(player?.socketId).toBe('socket_123');
    expect(player?.color).toBe('#ff007f');
  });

  test('Game Start should transition status to ACTIVE and reset boards', async () => {
    const lobby = await gameManager.createLobby();
    await gameManager.joinLobby(lobby.code, 'AstroPlayer', '#ff007f', 'socket_123');
    
    const started = await gameManager.startGame(lobby.code);
    
    expect(started).not.toBeNull();
    expect(started?.status).toBe('ACTIVE');
    expect(typeof started?.gameId).toBe('string');
    expect(started?.cells.size).toBe(0);
  });

  test('Cell Claims outside boundary values should return rejection states', async () => {
    const lobby = await gameManager.createLobby();
    await gameManager.joinLobby(lobby.code, 'AstroPlayer', '#ff007f', 'socket_123');
    await gameManager.startGame(lobby.code);

    // Coordinate indices must be in 0..899
    const invalidIndexUnder = await gameManager.claimCell(lobby.code, 'AstroPlayer', -5);
    const invalidIndexOver = await gameManager.claimCell(lobby.code, 'AstroPlayer', 920);

    expect(invalidIndexUnder).toBeNull();
    expect(invalidIndexOver).toBeNull();
  });

  test('Score Calculations should correctly sort standings and yield precise percentages', async () => {
    const lobby = await gameManager.createLobby();
    await gameManager.joinLobby(lobby.code, 'Alice', '#00f0ff', 'socket_alice');
    await gameManager.joinLobby(lobby.code, 'Bob', '#ff007f', 'socket_bob');
    await gameManager.startGame(lobby.code);

    // Simulate claims in cache
    lobby.cells.set(0, 'Alice');
    lobby.cells.set(1, 'Alice');
    lobby.cells.set(2, 'Bob');

    const leaderboard = gameManager.getLeaderboard(lobby);
    
    expect(leaderboard).toHaveLength(2);
    
    // Alice claimed 2/900 = ~0.2%
    expect(leaderboard[0].username).toBe('Alice');
    expect(leaderboard[0].cellsCount).toBe(2);
    expect(leaderboard[0].percentage).toBe(0.2);
    
    // Bob claimed 1/900 = ~0.1%
    expect(leaderboard[1].username).toBe('Bob');
    expect(leaderboard[1].cellsCount).toBe(1);
    expect(leaderboard[1].percentage).toBe(0.1);
  });
});
