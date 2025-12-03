import { registerAs } from '@nestjs/config';
import { AI } from './constants';

export default registerAs('ai', () => ({
  gemini: {
    apiKey: AI.GEMINI_API_KEY,
    model: AI.GEMINI_MODEL,
  },
}));
