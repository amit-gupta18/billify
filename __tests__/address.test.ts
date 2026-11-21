import { joinAddress, addressLines, singleLineName } from '../src/lib/address';

describe('addressLines', () => {
  it('formats structured address with city, state and PIN on the last line', () => {
    expect(
      addressLines({
        address: '',
        addressLine1: 'Shop No. 12, Shivaji Market',
        addressLine2: 'Near Andheri Station (East)',
        city: 'Mumbai',
        pincode: '400069',
        stateCode: '27',
      }),
    ).toEqual(['Shop No. 12, Shivaji Market', 'Near Andheri Station (East)', 'Mumbai, Maharashtra - 400069']);
  });

  it('skips empty structured parts', () => {
    expect(
      addressLines({ address: '', addressLine1: '5 MG Road', city: 'Pune', stateCode: '27' }),
    ).toEqual(['5 MG Road', 'Pune, Maharashtra']);
  });

  it('keeps line breaks of a legacy multi-line address', () => {
    expect(addressLines({ address: 'A-1 Street\nNoida' })).toEqual(['A-1 Street', 'Noida']);
  });

  it('re-flows a long legacy one-line address at commas', () => {
    expect(
      addressLines({
        address: 'Shop No. 12, Shivaji Market, Near Andheri Station, Andheri East, Mumbai 400069',
      }),
    ).toEqual(['Shop No. 12, Shivaji Market,', 'Near Andheri Station, Andheri East,', 'Mumbai 400069']);
  });
});

describe('joinAddress', () => {
  it('joins structured parts into one string', () => {
    expect(
      joinAddress({ addressLine1: '5 MG Road', city: 'Pune', pincode: '411001', stateCode: '27' }),
    ).toBe('5 MG Road, Pune, Maharashtra - 411001');
  });
});

describe('singleLineName', () => {
  it('keeps only the first line of a business name', () => {
    expect(singleLineName('  Acme Traders \n12 MG Road')).toBe('Acme Traders');
  });
});
