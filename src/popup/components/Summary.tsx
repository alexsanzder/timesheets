import React from 'react';
import { browser } from 'webextension-polyfill-ts';

import { RecordType } from '../../@types';

import Card from './Card';

const Summary = (): JSX.Element => {
  const [records, setRecords] = React.useState<RecordType[]>([]);

  React.useEffect(() => {
    (async (): Promise<void> => {
      const items = await browser.storage.local.get(['records']);
      setRecords(items.records);
    })();

    browser.storage.onChanged.addListener(({ records }: any) => {
      records && setRecords(records.newValue);
    });
  }, []);

  const groupBy = (array: any[], key: string): any => {
    return array?.reduce((result: any, currentValue: any) => {
      (result[currentValue[key]] = result[currentValue[key]] || []).push(currentValue);
      return result;
    }, {});
  };
  const itemsRecords = groupBy(records, 'date');

  return (
    <div className='flex flex-col items-center justify-center w-full'>
      {itemsRecords ? (
        Object.keys(itemsRecords).map((date: string) => (
          <Card records={itemsRecords} date={date} key={date} />
        ))
      ) : (
        <div>Loading...</div>
      )}
    </div>
  );
};
export default React.memo(Summary);
