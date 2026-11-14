import { describe,expect,it } from 'vitest';
import {parseTopupAmount} from './pdfCredits';
describe('PDF top-up pricing',()=>{
  it('converts rupees to exact paise and downloads',()=>{
    expect(parseTopupAmount('100')).toEqual({amountPaise:10000,credits:400});
    expect(parseTopupAmount('125.25')).toEqual({amountPaise:12525,credits:501});
  });
  it('rejects minimum, precision, range and coercion attacks',()=>{
    for(const value of ['99.99','100.01','100.001','1e4','Infinity',NaN,{},null,'-100','100000.25']) expect(parseTopupAmount(value)).toBeNull();
  });
});
