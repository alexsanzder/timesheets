/* global chrome gapi */
import * as React from 'react';
import { browser } from 'webextension-polyfill-ts';

import { CLEAR_STORAGE, SYNC, ADD_ROW, UPDATE_ROW, FINISH_ROW, DELETE_ROW } from '../utils/actions';

const CLIENT_ID = process.env.REACT_APP_CLIENT_ID;
const SPREADSHEET_ID = process.env.REACT_APP_SPREADSHEET_ID;
const SHEET_ID = +process.env.REACT_APP_SHEET_ID;
const TABLE_NAME = process.env.REACT_APP_TABLE_NAME;

const SCOPE = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/spreadsheets',
].join(' ');

import { ProjectType, RecordType } from '../@types';

/* eslint-disable no-undef */
console.log('Background.js file loaded!');

// Load table
const loadTable = async (): Promise<void> => {
  console.log('Loading table...');
  const response = await gapi.client.sheets.spreadsheets.values.batchGet({
    spreadsheetId: SPREADSHEET_ID,
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
    majorDimension: 'DIMENSION_UNSPECIFIED',
    ranges: ['projects!A2:C', `${TABLE_NAME}!A2:G`],
  });
  const {
    result: { valueRanges },
  } = response;

  const projects =
    valueRanges &&
    valueRanges[0].values?.reverse().map(
      (value: any[], index: number): ProjectType => {
        return {
          id: `!A${index + 2}`,
          company: value[0],
          project: value[1],
          details: value[0],
        };
      },
    );

  const records =
    valueRanges &&
    valueRanges[1].values
      ?.map(
        (value: any[], index: number): RecordType => {
          return {
            id: `${TABLE_NAME}!A${index + 2}:G${index + 2}`,
            name: value[0],
            date: value[1],
            company: value[2],
            project: value[3],
            description: value[4],
            ticket: value[5],
            time: value[6],
          };
        },
      )
      .filter((record) => record.time !== undefined);

  // Last record
  const lastRecord = records.slice(-1)[0];

  if (lastRecord.time === 0) {
    records.pop();
    browser.browserAction.setBadgeText({
      text: '▶️',
    });
  }

  // save table data in the brower local storage
  browser.storage.local.set({
    projects,
    lastRecord,
    range: lastRecord.id,
    records: records.slice(Math.max(records.length - 15, 0)).reverse(),
    isRunning: lastRecord.time === 0,
  });

  console.log('Table Data stored!');
};

// Orginize record object to be sure it has the same order for the row
const organize = (record): RecordType => ({
  name: undefined,
  date: undefined,
  company: undefined,
  project: undefined,
  description: undefined,
  ticket: undefined,
  time: undefined,
  ...record,
});

// Add row
const addRow = async ({ record }): Promise<RecordType> => {
  const { profile } = await browser.storage.local.get(['profile']);

  // Current Date for the record
  const today = new Date().toLocaleDateString('de', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // New record with fixed values
  const newRecord = {
    ...record,
    name: profile.name,
    date: today,
  } as RecordType;

  const organizedRecord = organize(newRecord);
  const values = Object.values(organizedRecord);
  const {
    result: {
      updates: { updatedRange },
    },
  } = await gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TABLE_NAME}!A2:G2`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: [values],
    },
  });

  const lastRecord = { ...organizedRecord, id: updatedRange };
  browser.storage.local.set({
    lastRecord,
  });

  return lastRecord;
};

// Update row
const updateRow = async ({ id: range, ...record }): Promise<RecordType> => {
  const organizedRecord = organize(record);
  const values = Object.values(organizedRecord);
  console.log('record to update', range, record);
  const {
    result: { updatedRange },
  } = await gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: range,
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [values],
    },
  });

  const lastRecord = { ...organizedRecord, id: updatedRange };
  browser.storage.local.set({ lastRecord });
  console.log(lastRecord);
  return lastRecord;
};

// Delete row
const deleteRow = async ({ index }): Promise<any> => {
  return await gapi.client.sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: SHEET_ID,
              dimension: 'ROWS',
              startIndex: index - 1,
              endIndex: index,
            },
          },
        },
      ],
    },
  });
};

/**
 * ON MESSAGE
 * comes from the content script embedded in the page or popup
 */
browser.runtime.onMessage.addListener(
  async (message): Promise<{ status: string; payload: {} }> => {
    console.log('Message action', message);
    const { action, payload } = message;
    if (action)
      switch (action) {
        case CLEAR_STORAGE:
          await browser.storage.local.clear();
          return Promise.resolve({ status: 'SUCCESS', payload: undefined });

        case SYNC:
          loadTable();
          const storage = await browser.storage.local.get(['records', 'projects']);
          return Promise.resolve({ status: 'SUCCESS', payload: storage });

        case ADD_ROW:
          browser.browserAction.setBadgeText({ text: '▶️' });
          const addRecord = await addRow(payload);
          return Promise.resolve({ status: 'ADD_SUCCESS', payload: { record: addRecord } });

        case UPDATE_ROW:
          browser.browserAction.setBadgeText({ text: '' });
          const updateRecord = await updateRow(payload);
          return Promise.resolve({
            status: 'UPDATE_SUCCESS',
            payload: { record: updateRecord },
          });

        case FINISH_ROW:
          browser.browserAction.setBadgeText({ text: '' });
          const { record } = payload;
          const { records, start } = await browser.storage.local.get(['records', 'start']);
          const time = Math.abs(Date.now() - start) / 36e5;

          const newRecord = { ...record, time };
          chrome.storage.local.set({ range: null });

          const finishRecord = await updateRow(newRecord);
          browser.storage.local.set({
            isRunning: false,
            start: 0,
            records: [finishRecord, ...records],
          });

          return Promise.resolve({ status: 'FINISH_SUCCESS', payload: { record: finishRecord } });

        case DELETE_ROW:
          alert('NOP');
          const delatedResponse = await deleteRow(payload);
          return Promise.resolve({ status: 'DELETE_SUCCESS', payload: delatedResponse });

        default:
          return Promise.resolve({
            status: 'ERROR',
            payload: 'unhandled message',
          });
      }
  },
);

const authorize = (): void => {
  console.log('Authorizing...');
  chrome.identity.getAuthToken({ interactive: true }, (token: string) => {
    gapi.auth.authorize(
      {
        // eslint-disable-next-line @typescript-eslint/camelcase
        client_id: CLIENT_ID,
        scope: SCOPE,
        immediate: true,
      },
      () => {
        console.log('Loading Sheets API...');
        gapi.client.load('sheets', 'v4', async () => {
          console.log('Setting access token...');
          // eslint-disable-next-line @typescript-eslint/camelcase
          gapi.client.setToken({ access_token: token });
          console.log('Getting User info...');
          const userInfo = await fetch(
            `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${token}`,
          );
          const profile = await userInfo.json();
          browser.storage.local.set({ profile });

          loadTable();
        });
      },
    );
  });
};

const loadScript = (url): void => {
  const request = new XMLHttpRequest();
  request.onreadystatechange = (): void => {
    if (request.readyState !== 4) {
      return;
    }
    if (request.status !== 200) {
      return;
    }
    // eslint-disable-next-line no-eval
    eval(request.responseText);
  };
  request.open('GET', url);
  request.send();
};

chrome.identity.getAuthToken({ interactive: true }, function () {
  //load Google's javascript client libraries
  // eslint-disable-next-line @typescript-eslint/camelcase
  (window as any).gapi_onload = authorize;
  loadScript('https://apis.google.com/js/client.js');
});
