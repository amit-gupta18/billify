import { amountInWords } from '../src/lib/amountInWords';

describe('amountInWords', () => {
  it('formats 33488 paise in Indian invoice style', () => {
    expect(amountInWords(33488)).toBe(
      'Indian Rupees Three Hundred Thirty Four and Eighty Eight Paise Only',
    );
  });
});
