// ============================================================================
// ROLEVERSE TELEGRAM BOT
// Dark Fantasy RP Experience
// ============================================================================

import { Telegraf, Markup, session } from 'telegraf';
import fetch from 'node-fetch';

// ============================================================================
// КОНФИГУРАЦИЯ
// ============================================================================
const HF_API_KEY = process.env.HF_API_KEY || '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';
const HF_API_URL = 'https://router.huggingface.co/v1/chat/completions';

const MODELS = {
  SMART: 'deepseek-ai/DeepSeek-R1:groq',
  CREATIVE: 'microsoft/Phi-3-mini-4k-instruct:hf',
  DETAILED: 'microsoft/Phi-3-mini-4k-instruct:hf'
};

// ============================================================================
// БАЗА ДАННЫХ ПЕРСОНАЖЕЙ (с сохранением атмосферы)
// ============================================================================
const CHARACTERS = {
  1: {
    id: 1,
    name: 'Изабелла Ночная',
    description: 'Вампирша из старинного рода, охотится на предателей клана',
    avatar: '💀',
    personality: 'Зло, холодная, опасная, centuries-old. Потрясена предательством.',
    speechStyle: {
      tone: 'ледяной, сдержанный',
      vocabulary: 'аристократичный, готический',
      habits: ['использует архаичные выражения', 'упоминает своё столетие']
    },
    location: 'manor',
    scenario: 'Изабелла Ночная охотится на предателя её клана. Ты знаешь где он скрывается, и она готова на всё ради этой информации...'
  },
  2: {
    id: 2,
    name: 'Вальдемар Кровавый',
    description: 'Охотник на вампиров с мстительной яростью в сердце',
    avatar: '🗡️',
    personality: 'Жестокий, прямолинейный, мстительный.',
    speechStyle: {
      tone: 'грубый, угрюмый',
      vocabulary: 'уличный, жестокий',
      habits: ['угрожает насилием', 'упоминает прошлое']
    },
    location: 'street',
    scenario: 'Вальдемар Кровавый ищет сбежавшую жертву. Ты мог видеть её в последний раз...'
  },
  3: {
    id: 3,
    name: 'Лилиана Тьмы',
    description: 'Ведьма Района Пепла, знахарка и пророчица',
    avatar: '🔮',
    personality: 'Мистическая, загадочная, обманчивая.',
    speechStyle: {
      tone: 'шёпот, медитативный',
      vocabulary: 'архаичный, мистический',
      habits: ['говорит загадками', 'использует метафоры']
    },
    location: 'cinema',
    scenario: 'Лилиана Тьмы предсказывает будущее в старом кинотеатре. Ты пришёл за пророчеством...'
  }
};

// ============================================================================
// СИСТЕМНЫЕ ПРОМПТЫ
// ============================================================================
function getSystemPrompt(character, location) {
  const locationDesc = {
    manor: 'Вы в гостиной старинного особняка. Огонь в камине пляшет, бросая тени на стены.',
    cinema: 'Вы в старом кинотеатре. На экране идёт чёрно-белый фильм, полумрак, запах попкорна.',
    street: 'Вы на улице Района Пепла. Густой туман, запах сырости и старой крови.'
  };

  const type = character.isVampire ? 'вампир' : character.isWerewolf ? 'оборотень' :
               character.isMage ? 'ведьма' : character.isHunter ? 'охотник' : 'опасная личность';

  return `Ты ${character.name} - ${type}.

Твоя личность:
${character.personality}

Ситуация: ${locationDesc[location] || locationDesc.street}

Правила ответа:
1. Говори в первый лицо (я/меня/моё)
2. Ответ 6-8 абзацев с деталями
3. Добавляй действия в формате *действие*
4. Реагируй на поведение игрока
5. Запоминай контекст
6. Будь живым персонажем, а не ботом
7. Используй характер - можешь отказать, выбрать по-своему
8. Поддерживай интригу и развитие сцены

Начни диалог в характере.`;
}

// ============================================================================
// АНАЛИЗ ПЕРСОНАЖА
// ============================================================================
function analyzeCharacter(character) {
  const p = (character.personality || '').toLowerCase();

  return {
    name: character.name,
    gender: character.name.endsWith('а') || character.name.endsWith('я') ? 'f' : 'm',
    isVampire: /вампир|кров/.test(p),
    isWerewolf: /оборот|волк/.test(p),
    isMage: /маг|колдов|ведьм/.test(p),
    isHunter: /охотни|палач|убийц/.test(p),
    isCold: /холодн|хладнокров|ледян/.test(p),
    isDangerous: /опасн|хищ|жесток/.test(p),
    isParanoid: /не довер|подозр|осторож/.test(p),
    isPlayful: /игрив|озорн|шутлив/.test(p),
    centuriesOld: /300|триста|500|век|столет/.test(p),
    hasAccent: /испанск|французск|английск/.test(p)
  };
}

// ============================================================================
// ИЗВЛЕЧЕНИЕ ЛОКАЦИИ
// ============================================================================
function extractLastLocation(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const content = messages[i].content.toLowerCase();
    if (/особняк|гостиная|камин|декантер|вино/.test(content)) return 'manor';
    if (/кино|кинотеатр|экран|попкорн/.test(content)) return 'cinema';
    if (/улица|туман|рэйон пэпл/.test(content)) return 'street';
  }
  return 'street';
}

// ============================================================================
// ОТПРАВКА ЗАПРОСА К HUGGING FACE
// ============================================================================
async function generateAIResponse(character, history, userMessage) {
  const char = analyzeCharacter(character);
  const currentLocation = extractLastLocation(history) || character.location || 'street';

  try {
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODELS.SMART,
        messages: [
          { role: 'system', content: getSystemPrompt(character, currentLocation) },
          ...history.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: userMessage }
        ],
        temperature: 0.9,
        max_tokens: 2500,
        stream: false
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('HF API error:', error);
      return generateFallbackResponse(character, history, userMessage);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();

  } catch (error) {
    console.error('HF API error:', error);
    return generateFallbackResponse(character, history, userMessage);
  }
}

// ============================================================================
// РЕЗЕРВНАЯ ГЕНЕРАЦИЯ (если API не работает)
// ============================================================================
function generateFallbackResponse(character, history, userMessage) {
  const responses = {
    greeting: [
      `*${character.name} оценивает тебя взглядом* — Гости. Я не ожидала посетителей в такое время. Что тебе нужно?`,
      `*Огонь в камине трещит в тишине* — Ты... Ты смеешь появляться здесь? Что привело тебя в мой дом?`,
      `*Изабелла медленно поднимается из кресла* — В Районе Пепла каждый шаг должен быть продуман. Кто ты и зачем пришёл?`
    ],
    default: [
      `*${character.name} прищуривает глаза* — Интересный выбор слов. Но ты всё ещё не отвечаешь на главный вопрос: что ты здесь ищешь?`,
      `*Она откидывается на спинку кресла, пальцы играют с бокалом* — Говори прямо. В Районе Пепла ложь стоит дорого, особенно для таких как ты.`,
      `*Взгляд становится острым, хищным* — Ты тратишь моё драгоценное время. Если у тебя есть информация — выкладывай. Если нет — уходи.`
    ]
  };

  const lowerMsg = userMessage.toLowerCase();
  if (/привет|здравств|добр/.test(lowerMsg)) {
    return responses.greeting[Math.floor(Math.random() * responses.greeting.length)];
  }
  return responses.default[Math.floor(Math.random() * responses.default.length)];
}

// ============================================================================
// СОХРАНЕНИЕ ИСТОРИИ (простое)
// ============================================================================
const userSessions = {};

function getUserHistory(userId) {
  if (!userSessions[userId]) {
    userSessions[userId] = {
      characterId: 1,
      messages: []
    };
  }
  return userSessions[userId];
}

function addToHistory(userId, role, content) {
  const history = getUserHistory(userId);
  history.messages.push({ role, content });
  // Ограничиваем историю последними 20 сообщениями
  if (history.messages.length > 20) {
    history.messages = history.messages.slice(-20);
  }
}

// ============================================================================
// TELEGRAM БОТ
// ============================================================================
const bot = new Telegraf(process.env.BOT_TOKEN);

// ============================================================================
// КОМАНДА /START
// ============================================================================
bot.start(async (ctx) => {
  const userId = ctx.from.id;

  await ctx.replyWithHTML(`*Мистический готический город, где вампиры и ведьмы делят власть над Районом Пепла*

Приветствую. Я - RoleVerse Bot.

Выбери персонажа для диалога:`, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '💀 Изабелла Ночная', callback_data: 'char_1' }],
        [{ text: '🗡️ Вальдемар Кровавый', callback_data: 'char_2' }],
        [{ text: '🔮 Лилиана Тьмы', callback_data: 'char_3' }]
      ]
    }
  });
});

// ============================================================================
// КНОПКИ ВЫБОРА ПЕРСОНАЖА
// ============================================================================
bot.action('char_1', async (ctx) => {
  const userId = ctx.from.id;
  userSessions[userId] = { characterId: 1, messages: [] };

  await ctx.editMessageText(`*Изабелла Ночная смотрит на тебя с холодным любопытством*

Ты стоишь в гостиной старинного особняка. Огонь в камине пляшет, бросая длинные тени на стены. Изабелла держит в руках хрустальный бокал с вином.

— Кто ты и что тебе нужно? Я не терплю лишних вопросов.`, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Вернуться', callback_data: 'back' }]
      ]
    }
  });

  addToHistory(userId, 'assistant', 'Изабелла Ночная смотрит на тебя с холодным любопытством. Ты стоишь в гостиной старинного особняка. — Кто ты и что тебе нужно? Я не терплю лишних вопросов.');
});

bot.action('char_2', async (ctx) => {
  const userId = ctx.from.id;
  userSessions[userId] = { characterId: 2, messages: [] };

  await ctx.editMessageText(`*Вальдемар Кровавый прислонился к стене, скрещивая руки на груди*

Уличный шум, густой туман Района Пепла. Он смотрит на тебя с явной враждебностью.

— Ха. Ещё один искатель приключений? Послушай сюда, смертный. Я не в настроении для разговоров.`, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Вернуться', callback_data: 'back' }]
      ]
    }
  });

  addToHistory(userId, 'assistant', 'Вальдемар Кровавый прислонился к стене. — Ха. Ещё один искатель приключений? Послушай сюда, смертный. Я не в настроении для разговоров.');
});

bot.action('char_3', async (ctx) => {
  const userId = ctx.from.id;
  userSessions[userId] = { characterId: 3, messages: [] };

  await ctx.editMessageText(`*Лилиана Тьмы сидит в кресле перед мерцающим экраном старого проектора*

В кинотеатре полумрак, запах попкорна. Она медленно поворачивается к тебе, глаза блестят в темноте.

— Ты пришёл за пророчеством... Или за чем-то другим?`, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Вернуться', callback_data: 'back' }]
      ]
    }
  });

  addToHistory(userId, 'assistant', 'Лилиана Тьмы сидит в кресле перед мерцающим экраном. — Ты пришёл за пророчеством... Или за чем-то другим?');
});

bot.action('back', async (ctx) => {
  await ctx.editMessageText(`*Мистический готический город, где вампиры и ведьмы делят власть над Районом Пепла*

Выбери персонажа для диалога:`, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '💀 Изабелла Ночная', callback_data: 'char_1' }],
        [{ text: '🗡️ Вальдемар Кровавый', callback_data: 'char_2' }],
        [{ text: '🔮 Лилиана Тьмы', callback_data: 'char_3' }]
      ]
    }
  });
});

// ============================================================================
// ОБРАБОТКА СООБЩЕНИЙ
// ============================================================================
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const userMessage = ctx.message.text;

  const session = getUserHistory(userId);
  const character = CHARACTERS[session.characterId];

  if (!character) {
    await ctx.reply('Сначала выбери персонажа: /start');
    return;
  }

  // Добавляем сообщение пользователя в историю
  addToHistory(userId, 'user', userMessage);

  // Отправляем статус "печатает..."
  await ctx.replyWithChatAction('typing');

  try {
    // Генерируем ответ AI
    const response = await generateAIResponse(character, session.messages, userMessage);

    // Добавляем ответ AI в историю
    addToHistory(userId, 'assistant', response);

    // Отправляем ответ пользователю
    await ctx.replyWithHTML(response);

  } catch (error) {
    console.error('Error:', error);
    await ctx.reply('❌ Произошла ошибка при генерации ответа. Попробуйте позже.');
  }
});

// ============================================================================
// ЗАПУСК БОТА
// ============================================================================
bot.launch();
console.log('🤖 RoleVerse Bot запущен...');

// Грейс-шUTDOWN
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
